'use strict';
const { app, BrowserWindow, WebContentsView, ipcMain, dialog, shell, session, Menu, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// themes/ и backgrounds/ лежат РЯДОМ с exe (в разработке — рядом с main.js), чтобы их можно было править руками
const BASE = app.isPackaged ? path.dirname(process.execPath) : __dirname;
const THEMES = path.join(BASE, 'themes');
const BGS = path.join(BASE, 'backgrounds');
const PARTITION = 'persist:femboy';
const VIDEO = ['.mp4', '.webm', '.mkv', '.mov'];
const BG_EXT = [...VIDEO, '.gif'];
const ENGINES = {
  DuckDuckGo: 'https://duckduckgo.com/?q=%s',
  Google: 'https://www.google.com/search?q=%s',
  Bing: 'https://www.bing.com/search?q=%s',
  Yandex: 'https://yandex.com/search/?text=%s',
  Brave: 'https://search.brave.com/search?q=%s',
};
const DEFAULT_THEME = {
  name: 'Custom', background: 'bg', bg: '#2b1530', panel: '#4a2250', accent: '#ff8fc7', accent2: '#ffb3d9',
  text: '#fff0f8', text_dim: '#e7b7d6', radius: 16, panel_opacity: 0.72, overlay_opacity: 0.3, blur: 18,
  font: 'Segoe UI', style_web: true,
};

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const writeJson = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2), 'utf8');

// ───────────── хранилище (закладки / история / настройки) ─────────────
const store = { bookmarks: [], history: [], settings: { theme: 'Sakura Bunny', search: 'DuckDuckGo' } };
const storeFile = (k) => path.join(app.getPath('userData'), k + '.json');
function loadStore() {
  store.bookmarks = readJson(storeFile('bookmarks'), []);
  store.history = readJson(storeFile('history'), []);
  store.settings = { ...store.settings, ...readJson(storeFile('settings'), {}) };
}
const saveStore = (k) => { try { writeJson(storeFile(k), store[k]); } catch (e) { console.error(e); } };

// ───────────── темы и фоны ─────────────
function listThemes() {
  const out = [];
  for (const f of fs.existsSync(THEMES) ? fs.readdirSync(THEMES) : []) {
    if (!f.endsWith('.json')) continue;
    const d = readJson(path.join(THEMES, f), null);
    if (d && d.name) out.push({ ...DEFAULT_THEME, ...d, _file: f });
  }
  return out.length ? out : [{ ...DEFAULT_THEME }];
}
function listBackgrounds() {
  const map = new Map();
  for (const f of fs.existsSync(BGS) ? fs.readdirSync(BGS) : []) {
    const ext = path.extname(f).toLowerCase();
    if (!BG_EXT.includes(ext)) continue;
    const stem = path.basename(f, ext), full = path.join(BGS, f), video = VIDEO.includes(ext);
    const prev = map.get(stem);
    if (!prev || (video && !prev.video)) { // mp4 приоритетнее gif
      map.set(stem, { stem, file: f, video, url: pathToFileURL(full).href + '?v=' + Math.floor(fs.statSync(full).mtimeMs) });
    }
  }
  return [...map.values()].sort((a, b) => a.stem.localeCompare(b.stem, undefined, { numeric: true }));
}

function toUrl(text) {
  text = String(text || '').trim();
  if (/^[a-z][a-z0-9+.\-]*:\/\//i.test(text) || text === 'about:blank') return text;
  if (!/\s/.test(text)) {
    if (/^localhost(:\d+)?(\/.*)?$/i.test(text) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(text)) return 'http://' + text;
    if (/^[^\s\/]+\.[^\s.\/]{2,}(:\d+)?(\/.*)?$/.test(text)) return 'https://' + text;
  }
  return (ENGINES[store.settings.search] || ENGINES.DuckDuckGo).replace('%s', encodeURIComponent(text));
}

// ───────────── окно и вкладки ─────────────
let win = null;
let tabs = [], activeId = null, nextId = 1;
let bounds = { x: 0, y: 90, width: 800, height: 500 };
let frozen = false, fsTabId = null;
let webStyle = { accent: null, radius: 12 };

const getTab = (id) => tabs.find((t) => t.id === id);
const send = (ch, ...a) => { if (win && !win.isDestroyed()) win.webContents.send(ch, ...a); };
const toast = (text) => send('toast', text);

function pushState() {
  send('state', {
    activeId,
    tabs: tabs.map((t) => ({ id: t.id, title: t.title, url: t.url, favicon: t.favicon, loading: t.loading, blank: t.blank, canBack: t.canBack, canForward: t.canForward })),
  });
}

function layoutViews() {
  for (const t of tabs) {
    const show = t.id === activeId && !t.blank && !frozen;
    if (show) {
      const full = fsTabId === t.id;
      const cb = win.getContentBounds();
      t.view.setBounds(full ? { x: 0, y: 0, width: cb.width, height: cb.height } : bounds);
      if (t.view.setBorderRadius) { try { t.view.setBorderRadius(full ? 0 : webStyle.radius); } catch { /* старый electron */ } }
    }
    t.view.setVisible(show);
  }
}

const sheet = (accent) =>
  `::-webkit-scrollbar{width:12px;height:12px}::-webkit-scrollbar-thumb{background:${accent};border-radius:10px;border:3px solid transparent;background-clip:content-box}` +
  `::-webkit-scrollbar-track{background:transparent}::selection{background:${accent};color:#fff}`;

async function applyWebCss(tab) {
  const wc = tab.view.webContents;
  try {
    if (tab.cssKey) { await wc.removeInsertedCSS(tab.cssKey); tab.cssKey = null; }
    if (webStyle.accent && !wc.isDestroyed()) tab.cssKey = await wc.insertCSS(sheet(webStyle.accent));
  } catch { /* страница ещё не готова */ }
}

function shortcut(i) {
  const k = String(i.key || '').toLowerCase(), c = i.control || i.meta;
  if (i.alt && !c) return k === 'arrowleft' ? 'back' : k === 'arrowright' ? 'forward' : null;
  if (k === 'f5') return 'reload';
  if (k === 'f11') return 'fullscreen';
  if (k === 'f12') return 'devtools';
  if (k === 'escape') return 'escape';
  if (!c) return null;
  if (i.shift) return k === 't' ? 'themes' : k === 'tab' ? 'prevtab' : null;
  return { t: 'newtab', w: 'closetab', l: 'focusurl', f: 'find', d: 'bookmark', r: 'reload', h: 'history', b: 'bookmarks', tab: 'nexttab', '=': 'zoomin', '+': 'zoomin', '-': 'zoomout', '0': 'zoomreset' }[k] || null;
}
function attachShortcuts(wc) {
  wc.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const cmd = shortcut(input);
    if (!cmd) return;
    if (cmd !== 'escape') e.preventDefault();
    send('cmd', cmd);
  });
}

function createTab(url, activate = true) {
  const view = new WebContentsView({ webPreferences: { partition: PARTITION, sandbox: true, contextIsolation: true } });
  view.setBackgroundColor('#ffffff');
  const tab = { id: nextId++, view, title: 'Новая вкладка', url: '', favicon: null, loading: false, blank: !url, canBack: false, canForward: false, cssKey: null };
  tabs.push(tab);
  win.contentView.addChildView(view);
  view.setVisible(false);
  const wc = view.webContents;
  attachShortcuts(wc);

  const nav = () => {
    const h = wc.navigationHistory;
    tab.canBack = h ? h.canGoBack() : wc.canGoBack();
    tab.canForward = h ? h.canGoForward() : wc.canGoForward();
  };
  wc.on('page-title-updated', (_e, t) => { tab.title = t; pushState(); });
  wc.on('page-favicon-updated', (_e, f) => { tab.favicon = f[0] || null; pushState(); });
  wc.on('did-start-loading', () => { tab.loading = true; pushState(); });
  wc.on('did-stop-loading', () => { tab.loading = false; nav(); pushState(); });
  wc.on('did-navigate', (_e, u) => { tab.url = u === 'about:blank' ? '' : u; nav(); pushState(); });
  wc.on('did-navigate-in-page', (_e, u, isMain) => { if (isMain) { tab.url = u; nav(); pushState(); } });
  wc.on('dom-ready', () => applyWebCss(tab));
  wc.on('did-finish-load', () => {
    const u = wc.getURL();
    if (/^https?:/.test(u)) {
      const h = store.history;
      if (!h.length || h[h.length - 1].url !== u) { h.push({ title: wc.getTitle(), url: u, t: Date.now() }); store.history = h.slice(-1500); saveStore('history'); }
    }
  });
  wc.on('found-in-page', (_e, r) => send('found', { active: r.activeMatchOrdinal, total: r.matches }));
  wc.on('enter-html-full-screen', () => { fsTabId = tab.id; win.setFullScreen(true); layoutViews(); });
  wc.on('leave-html-full-screen', () => { fsTabId = null; win.setFullScreen(false); layoutViews(); });
  wc.setWindowOpenHandler(({ url: u }) => { createTab(u); return { action: 'deny' }; });
  wc.on('context-menu', (_e, p) => {
    const tpl = [];
    if (p.linkURL) tpl.push({ label: 'Открыть ссылку в новой вкладке', click: () => createTab(p.linkURL) }, { label: 'Копировать ссылку', click: () => clipboard.writeText(p.linkURL) }, { type: 'separator' });
    if (p.selectionText) tpl.push({ role: 'copy', label: 'Копировать' });
    if (p.isEditable) tpl.push({ role: 'paste', label: 'Вставить' });
    if (p.srcURL && p.mediaType === 'image') tpl.push({ label: 'Копировать адрес картинки', click: () => clipboard.writeText(p.srcURL) });
    tpl.push({ label: 'Назад', enabled: tab.canBack, click: () => wc.goBack() }, { label: 'Обновить', click: () => wc.reload() }, { type: 'separator' },
      { label: 'Исследовать элемент', click: () => wc.inspectElement(p.x, p.y) });
    Menu.buildFromTemplate(tpl).popup({ window: win });
  });

  if (url) wc.loadURL(toUrl(url)).catch(() => {});
  if (activate) activeId = tab.id;
  layoutViews();
  pushState();
  return tab;
}

function closeTab(id) {
  const i = tabs.findIndex((t) => t.id === id);
  if (i < 0) return;
  const [tab] = tabs.splice(i, 1);
  win.contentView.removeChildView(tab.view);
  try { tab.view.webContents.close(); } catch { /* уже закрыт */ }
  if (!tabs.length) { win.close(); return; }
  if (activeId === id) activeId = tabs[Math.min(i, tabs.length - 1)].id;
  layoutViews();
  pushState();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1320, height: 840, minWidth: 780, minHeight: 520, frame: false, show: false, backgroundColor: '#2b1530',
    title: 'Femboy Browser',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());
  attachShortcuts(win.webContents);
  win.webContents.on('did-finish-load', () => { if (!tabs.length) createTab(null); else pushState(); });
  win.on('maximize', () => send('win:state', { max: true }));
  win.on('unmaximize', () => send('win:state', { max: false }));
  win.on('closed', () => { win = null; });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

function setupSession() {
  const ses = session.fromPartition(PARTITION);
  ses.setUserAgent(ses.getUserAgent().replace(/\sElectron\/\S+/, '').replace(/\sfemboy-browser\/\S+/i, ''));
  const allowed = ['fullscreen', 'clipboard-sanitized-write', 'pointerLock', 'notifications'];
  ses.setPermissionRequestHandler((_wc, perm, cb) => cb(allowed.includes(perm)));
  ses.on('will-download', (_e, item) => {
    const dir = app.getPath('downloads');
    const ext = path.extname(item.getFilename()), stem = path.basename(item.getFilename(), ext);
    let p = path.join(dir, item.getFilename());
    for (let n = 1; fs.existsSync(p); n++) p = path.join(dir, `${stem} (${n})${ext}`);
    item.setSavePath(p);
    toast('⬇ Скачивание: ' + path.basename(p));
    item.once('done', (_ev, st) => toast(st === 'completed' ? '✔ Скачано: ' + path.basename(p) : '✖ Загрузка не удалась'));
  });
}

function watchDirs() {
  let timer = null;
  const ping = () => { clearTimeout(timer); timer = setTimeout(() => send('themes:changed'), 400); };
  for (const d of [THEMES, BGS]) { try { fs.watch(d, ping); } catch { /* нет папки */ } }
}

// ───────────── IPC ─────────────
const H = (ch, fn) => ipcMain.handle(ch, (_e, ...a) => fn(...a));
H('tab:new', (url) => { createTab(url || null); });
H('tab:close', closeTab);
H('tab:switch', (id) => { if (getTab(id)) { activeId = id; layoutViews(); pushState(); } });
H('tab:move', (id, idx) => {
  const i = tabs.findIndex((t) => t.id === id);
  if (i < 0) return;
  const [t] = tabs.splice(i, 1);
  tabs.splice(Math.max(0, Math.min(idx, tabs.length)), 0, t);
  pushState();
});
H('nav:go', (id, input) => {
  const t = getTab(id);
  if (!t) return;
  t.blank = false;
  t.view.webContents.loadURL(toUrl(input)).catch(() => {});
  layoutViews();
  pushState();
});
H('nav:back', (id) => { const t = getTab(id); if (t) t.view.webContents.goBack(); });
H('nav:forward', (id) => { const t = getTab(id); if (t) t.view.webContents.goForward(); });
H('nav:reload', (id) => { const t = getTab(id); if (t && !t.blank) t.view.webContents.reload(); });
H('nav:stop', (id) => { const t = getTab(id); if (t) t.view.webContents.stop(); });
H('nav:home', (id) => {
  const t = getTab(id);
  if (!t) return;
  t.blank = true; t.title = 'Новая вкладка'; t.url = '';
  t.view.webContents.loadURL('about:blank').catch(() => {});
  layoutViews();
  pushState();
});

H('layout:bounds', (r) => { bounds = { x: Math.round(r.x), y: Math.round(r.y), width: Math.max(1, Math.round(r.width)), height: Math.max(1, Math.round(r.height)) }; layoutViews(); });
H('view:freeze', async () => {
  const t = getTab(activeId);
  if (!t || t.blank || frozen) return null;
  try {
    const img = await t.view.webContents.capturePage();
    frozen = true;
    layoutViews();
    return 'data:image/jpeg;base64,' + img.toJPEG(82).toString('base64');
  } catch { return null; }
});
H('view:unfreeze', () => { frozen = false; layoutViews(); });

H('win:min', () => win.minimize());
H('win:max', () => (win.isMaximized() ? win.unmaximize() : win.maximize()));
H('win:close', () => win.close());
H('win:fullscreen', () => win.setFullScreen(!win.isFullScreen()));

H('find', (text, forward, next) => {
  const t = getTab(activeId);
  if (!t || t.blank) return;
  if (!text) t.view.webContents.stopFindInPage('clearSelection');
  else t.view.webContents.findInPage(text, { forward, findNext: next });
});
H('find:stop', () => { const t = getTab(activeId); if (t && !t.blank) t.view.webContents.stopFindInPage('clearSelection'); });
H('zoom', (d) => {
  const t = getTab(activeId);
  if (!t || t.blank) return;
  const wc = t.view.webContents;
  const z = d === 0 ? 1 : Math.max(0.25, Math.min(5, wc.getZoomFactor() + d));
  wc.setZoomFactor(z);
  toast('🔍 ' + Math.round(z * 100) + '%');
});
H('devtools', () => { const t = getTab(activeId); if (t && !t.blank) t.view.webContents.openDevTools({ mode: 'detach' }); });

H('store:get', (k) => store[k]);
H('store:set', (k, v) => { if (k in store) { store[k] = v; saveStore(k); } });
H('themes:list', () => ({ themes: listThemes(), backgrounds: listBackgrounds(), settings: store.settings }));
H('themes:save', (t) => {
  const data = { ...t };
  for (const k of Object.keys(data)) if (k.startsWith('_')) delete data[k];
  const slug = String(data.name || '').trim().toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'theme';
  writeJson(path.join(THEMES, slug + '.json'), data);
  return listThemes();
});
H('themes:remove', (name) => {
  const all = listThemes();
  const t = all.find((x) => x.name === name);
  if (all.length > 1 && t && t._file) { try { fs.unlinkSync(path.join(THEMES, t._file)); } catch { /* ignore */ } }
  return listThemes();
});
H('bg:add', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Видео / GIF', extensions: ['mp4', 'webm', 'mkv', 'mov', 'gif'] }] });
  let added = null;
  if (!r.canceled && r.filePaths[0]) {
    const src = r.filePaths[0], ext = path.extname(src).toLowerCase();
    const used = new Set(listBackgrounds().map((b) => b.stem));
    let stem = 'bg';
    for (let i = 1; used.has(stem); i++) stem = 'bg' + i;
    fs.copyFileSync(src, path.join(BGS, stem + ext));
    added = stem;
  }
  return { backgrounds: listBackgrounds(), added };
});
H('open:folder', (which) => shell.openPath(which === 'bg' ? BGS : THEMES));
H('webcss:set', (o) => {
  webStyle = { accent: o.accent || null, radius: Number(o.radius) || 0 };
  for (const t of tabs) applyWebCss(t);
  layoutViews();
});
H('app:quit', () => app.quit());

app.whenReady().then(() => {
  for (const d of [THEMES, BGS]) fs.mkdirSync(d, { recursive: true });
  Menu.setApplicationMenu(null);
  loadStore();
  setupSession();
  createWindow();
  watchDirs();
});
app.on('window-all-closed', () => app.quit());
