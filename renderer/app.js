'use strict';
const $ = (s, r = document) => r.querySelector(s);
const ENGINES = ['DuckDuckGo', 'Google', 'Bing', 'Yandex', 'Brave'];
const FONTS = ['Segoe UI', 'Nunito', 'Verdana', 'Trebuchet MS', 'Tahoma', 'Arial', 'Georgia', 'Comic Sans MS', 'Consolas', 'Candara', 'Calibri'];
const DEFAULT_THEME = { name: 'Custom', background: 'bg', bg: '#2b1530', panel: '#4a2250', accent: '#ff8fc7', accent2: '#ffb3d9', text: '#fff0f8', text_dim: '#e7b7d6', radius: 16, panel_opacity: 0.72, overlay_opacity: 0.3, blur: 18, font: 'Segoe UI', style_web: true };

// ───────────── иконки ─────────────
const ICONS = {
  back: 'M15 18l-6-6 6-6', fwd: 'M9 18l6-6-6-6', up: 'M18 15l-6-6-6 6', down: 'M6 9l6 6 6-6',
  reload: 'M23 4v6h-6M20.5 15a9 9 0 1 1-2.1-9.4L23 10', home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1z', menu: 'M3 6h18M3 12h18M3 18h18',
  palette: 'M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.5-1.9-.3-1 .4-2.1 1.5-2.1H17a4 4 0 0 0 4-4c0-5-4-10-9-10zM7.5 11h.01M10 7h.01M15 7h.01M17.5 11h.01',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3', lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  min: 'M5 12h14', max: 'M6 6h12v12H6z', close: 'M6 6l12 12M18 6L6 18', plus: 'M12 5v14M5 12h14',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  zoom: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM11 8v6M8 11h6M21 21l-4.3-4.3', full: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6', film: 'M4 4h16v16H4zM4 9h16M4 15h16M9 4v16M15 4v16', power: 'M12 2v10M18.4 6.6a9 9 0 1 1-12.8 0', tab: 'M3 7h18v12H3zM3 7l3-3h6l3 3', trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
};
const ic = (n, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[n]}"/></svg>`;
document.querySelectorAll('[data-ic]').forEach((el) => { el.innerHTML = ic(el.dataset.ic, el.classList.contains('sm') ? 16 : (el.closest('#winctl') ? 14 : 18)); });

// ───────────── состояние ─────────────
let state = { tabs: [], activeId: null };
let themes = [], backgrounds = [], theme = { ...DEFAULT_THEME }, settings = { theme: 'Sakura Bunny', search: 'DuckDuckGo' };
let bookmarks = [];
const active = () => state.tabs.find((t) => t.id === state.activeId);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

function toast(text) {
  const t = el('div', 'toast', text);
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 3200);
}

// ───────────── темы ─────────────
function rgba(hex, a) {
  const n = parseInt(String(hex).replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
let curBgUrl = null;
function setBackground(stem) {
  const b = backgrounds.find((x) => x.stem === String(stem || '').replace(/\.\w+$/, ''));
  const url = b ? b.url : null;
  if (url === curBgUrl) return;
  curBgUrl = url;
  const v = $('#bgvid'), i = $('#bgimg');
  v.style.display = i.style.display = 'none';
  v.removeAttribute('src'); i.removeAttribute('src');
  if (!b) return;
  if (b.video) { v.src = url; v.style.display = 'block'; v.play().catch(() => {}); } else { i.src = url; i.style.display = 'block'; }
}
function applyTheme(t) {
  theme = { ...DEFAULT_THEME, ...t };
  const r = document.documentElement.style;
  r.setProperty('--bg', theme.bg); r.setProperty('--panel', theme.panel);
  r.setProperty('--panel-rgba', rgba(theme.panel, theme.panel_opacity));
  r.setProperty('--accent', theme.accent); r.setProperty('--accent2', theme.accent2);
  r.setProperty('--text', theme.text); r.setProperty('--text-dim', theme.text_dim);
  r.setProperty('--radius', theme.radius + 'px'); r.setProperty('--blur', theme.blur + 'px');
  r.setProperty('--shade', theme.overlay_opacity);
  r.setProperty('--font', `'${theme.font}', 'Segoe UI', system-ui, sans-serif`);
  setBackground(theme.background);
  api.setWebStyle({ accent: theme.style_web ? theme.accent : null, radius: theme.radius * 0.75 });
}
async function selectTheme(name) {
  const t = themes.find((x) => x.name === name) || themes[0];
  applyTheme(t);
  settings.theme = t.name;
  api.store.set('settings', settings);
}
async function reloadThemes() {
  const d = await api.themes.list();
  themes = d.themes; backgrounds = d.backgrounds; settings = d.settings;
  return d;
}

// ───────────── вкладки ─────────────
function renderTabs() {
  const box = $('#tabs');
  box.innerHTML = '';
  state.tabs.forEach((t, idx) => {
    const tab = el('div', 'tab' + (t.id === state.activeId ? ' active' : ''));
    tab.draggable = true; tab.title = t.title;
    const fav = el('span', 'fav');
    if (t.loading) fav.appendChild(el('span', 'spin'));
    else if (t.favicon && !t.blank) { const im = document.createElement('img'); im.src = t.favicon; im.onerror = () => { fav.textContent = '✿'; }; fav.appendChild(im); }
    else fav.textContent = '✿';
    tab.append(fav, el('span', 'ttl', t.blank ? 'Новая вкладка' : (t.title || t.url)));
    const x = el('button', 'x'); x.innerHTML = ic('close', 12);
    x.onclick = (e) => { e.stopPropagation(); api.closeTab(t.id); };
    tab.appendChild(x);
    tab.onclick = () => api.switchTab(t.id);
    tab.onauxclick = (e) => { if (e.button === 1) api.closeTab(t.id); };
    tab.ondragstart = (e) => { e.dataTransfer.setData('text/plain', String(t.id)); };
    tab.ondragover = (e) => { e.preventDefault(); tab.classList.add('drag-over'); };
    tab.ondragleave = () => tab.classList.remove('drag-over');
    tab.ondrop = (e) => { e.preventDefault(); tab.classList.remove('drag-over'); const id = Number(e.dataTransfer.getData('text/plain')); if (id && id !== t.id) api.moveTab(id, idx); };
    box.appendChild(tab);
  });
}

function syncUi() {
  const t = active();
  renderTabs();
  $('#b-back').disabled = !t || t.blank || !t.canBack;
  $('#b-fwd').disabled = !t || t.blank || !t.canForward;
  $('#b-reload').innerHTML = ic(t && t.loading ? 'close' : 'reload');
  const url = $('#url');
  if (document.activeElement !== url) url.value = !t || t.blank ? '' : t.url;
  $('#omni-ic').innerHTML = ic(t && !t.blank && /^https:/.test(t.url) ? 'lock' : 'search', 16);
  $('#b-star').classList.toggle('on', !!(t && !t.blank && bookmarks.some((b) => b.url === t.url)));
  $('#start').hidden = !(t && t.blank);
  document.title = t && !t.blank ? `${t.title} — Femboy Browser` : 'Femboy Browser';
}
api.on('state', (s) => { state = s; syncUi(); });

// ───────────── стартовая страница ─────────────
function renderTiles() {
  const box = $('#tiles');
  box.innerHTML = '';
  const items = bookmarks.slice(0, 8);
  const list = items.length ? items : [{ title: 'YouTube', url: 'https://youtube.com' }, { title: 'Pinterest', url: 'https://pinterest.com' }, { title: 'GitHub', url: 'https://github.com' }, { title: 'Wikipedia', url: 'https://wikipedia.org' }];
  for (const b of list) {
    const tile = el('button', 'tile');
    const name = b.title || b.url;
    tile.append(el('div', 'ico', (name.trim()[0] || '✿').toUpperCase()), el('div', 'nm', name));
    tile.onclick = () => go(b.url);
    box.appendChild(tile);
  }
}
function buildSparkles() {
  const box = $('#sparkles');
  for (let i = 0; i < 16; i++) {
    const s = el('span', 'spark', ['✦', '✧', '♡', '✿'][i % 4]);
    s.style.cssText = `left:${Math.random() * 96}%;top:${Math.random() * 92}%;font-size:${10 + Math.random() * 16}px;animation-delay:${Math.random() * 4}s;animation-duration:${3 + Math.random() * 3}s`;
    box.appendChild(s);
  }
}
function tickClock() {
  const d = new Date();
  $('#clock').textContent = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  $('#date').textContent = d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
}

function go(text) {
  const t = active();
  if (t && text.trim()) api.go(t.id, text);
}
$('#url').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { go($('#url').value); $('#url').blur(); }
  if (e.key === 'Escape') { $('#url').blur(); syncUi(); }
});
$('#url').addEventListener('focus', () => $('#url').select());
$('#start-in').addEventListener('keydown', (e) => { if (e.key === 'Enter') { go($('#start-in').value); $('#start-in').value = ''; } });

$('#newtab').onclick = () => api.newTab();
$('#b-back').onclick = () => active() && api.back(active().id);
$('#b-fwd').onclick = () => active() && api.forward(active().id);
$('#b-reload').onclick = () => { const t = active(); if (t) (t.loading ? api.stop(t.id) : api.reload(t.id)); };
$('#b-home').onclick = () => active() && api.home(active().id);
$('#b-star').onclick = toggleBookmark;
$('#w-min').onclick = () => api.win.min();
$('#w-max').onclick = () => api.win.max();
$('#w-close').onclick = () => api.win.close();
api.on('win:state', (s) => { $('#w-max').innerHTML = ic(s.max ? 'tab' : 'max', 14); });
api.on('toast', toast);

function toggleBookmark() {
  const t = active();
  if (!t || t.blank) return;
  const i = bookmarks.findIndex((b) => b.url === t.url);
  if (i >= 0) { bookmarks.splice(i, 1); toast('Убрано из закладок'); } else { bookmarks.unshift({ title: t.title, url: t.url }); toast('★ Добавлено в закладки'); }
  api.store.set('bookmarks', bookmarks);
  renderTiles(); syncUi();
  if (panelKind === 'bookmarks') renderList('bookmarks');
}

// ───────────── границы окна страницы ─────────────
let rafId = 0;
function sendBounds() {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => { const r = $('#content').getBoundingClientRect(); api.setBounds({ x: r.x, y: r.y, width: r.width, height: r.height }); });
}
new ResizeObserver(sendBounds).observe($('#content'));
window.addEventListener('resize', sendBounds);

// ───────────── всплывающие окна (страница временно «замораживается» в картинку) ─────────────
let popupEl = null, popupToken = 0;
async function openPopup(popup, anchor) {
  if (popupEl === popup) { closePopups(); return; }
  closePopups();
  const token = ++popupToken;
  popupEl = popup;
  const data = await api.freeze();
  if (token !== popupToken) { if (data) api.unfreeze(); return; }
  if (data) { $('#freeze').src = data; $('#freeze').hidden = false; }
  popup.hidden = false;
  const r = anchor.getBoundingClientRect();
  popup.style.top = r.bottom + 8 + 'px';
  popup.style.right = Math.max(10, window.innerWidth - r.right - 4) + 'px';
}
function closePopups() {
  popupToken++;
  if (!popupEl) return;
  popupEl.hidden = true; popupEl = null;
  $('#freeze').hidden = true; $('#freeze').removeAttribute('src');
  api.unfreeze();
}
document.addEventListener('mousedown', (e) => { if (popupEl && !popupEl.contains(e.target) && !e.target.closest('#b-theme, #b-menu')) closePopups(); });

function mi(icon, label, fn, extra) {
  const b = el('button', 'mi'); b.innerHTML = icon ? ic(icon, 16) : '';
  b.appendChild(el('span', '', label));
  if (extra) b.appendChild(el('span', 'sc', extra));
  b.onclick = () => { closePopups(); fn(); };
  return b;
}

function buildThemeMenu() {
  const m = $('#theme-menu');
  m.innerHTML = '';
  m.appendChild(el('div', 'mh', 'Темы'));
  for (const t of themes) {
    const b = el('button', 'mi' + (t.name === theme.name ? ' cur' : ''));
    const dot = el('span', 'dot'); dot.style.background = `linear-gradient(135deg, ${t.accent}, ${t.accent2})`;
    b.append(dot, el('span', '', t.name));
    if (t.name === theme.name) b.appendChild(el('span', 'sc', '✿'));
    b.onclick = () => { closePopups(); selectTheme(t.name); };
    m.appendChild(b);
  }
  m.appendChild(el('div', 'sep'));
  m.appendChild(mi('palette', 'Редактор тем…', () => openPanel('theme'), 'Ctrl+Shift+T'));
  m.appendChild(mi('folder', 'Папка тем', () => api.openFolder('themes')));
  m.appendChild(mi('film', 'Папка фонов', () => api.openFolder('bg')));
}
function buildMainMenu() {
  const m = $('#main-menu');
  m.innerHTML = '';
  m.appendChild(mi('plus', 'Новая вкладка', () => api.newTab(), 'Ctrl+T'));
  m.appendChild(mi('star', 'Закладки', () => openPanel('bookmarks'), 'Ctrl+B'));
  m.appendChild(mi('clock', 'История', () => openPanel('history'), 'Ctrl+H'));
  m.appendChild(el('div', 'sep'));
  m.appendChild(el('div', 'mh', 'Поисковик'));
  for (const n of ENGINES) {
    const b = el('button', 'mi' + (settings.search === n ? ' cur' : ''));
    b.append(el('span', '', (settings.search === n ? '● ' : '○ ') + n));
    b.onclick = () => { settings.search = n; api.store.set('settings', settings); closePopups(); toast('Поисковик: ' + n); };
    m.appendChild(b);
  }
  m.appendChild(el('div', 'sep'));
  const z = el('div', 'zoomrow');
  z.appendChild(el('span', '', 'Масштаб'));
  const zb = el('div');
  for (const [txt, d] of [['−', -0.1], ['100%', 0], ['+', 0.1]]) { const b = el('button', 'ib sm', txt); b.style.display = 'inline-grid'; b.style.width = txt.length > 1 ? '50px' : '30px'; b.onclick = () => api.zoom(d); zb.appendChild(b); }
  z.appendChild(zb);
  m.appendChild(z);
  m.appendChild(mi('find', 'Поиск на странице', toggleFind, 'Ctrl+F'));
  m.appendChild(mi('full', 'На весь экран', () => api.win.fullscreen(), 'F11'));
  m.appendChild(mi('code', 'Инструменты разработчика', () => api.devtools(), 'F12'));
  m.appendChild(el('div', 'sep'));
  m.appendChild(mi('power', 'Выход', () => api.quit()));
}
ICONS.find = ICONS.search;
$('#b-theme').onclick = () => { buildThemeMenu(); openPopup($('#theme-menu'), $('#b-theme')); };
$('#b-menu').onclick = () => { buildMainMenu(); openPopup($('#main-menu'), $('#b-menu')); };

// ───────────── боковая панель ─────────────
let panelKind = null, panelCleanup = null;
function openPanel(kind) {
  closePopups();
  if (panelKind === kind) { closePanel(); return; }
  closePanel();
  panelKind = kind;
  $('#panel').classList.add('open');
  if (kind === 'theme') renderThemePanel(); else renderList(kind);
}
function closePanel() {
  if (panelCleanup) { panelCleanup(); panelCleanup = null; }
  panelKind = null;
  $('#panel').classList.remove('open');
}
$('#panel-close').onclick = closePanel;

async function renderList(kind) {
  $('#panel-title').textContent = kind === 'bookmarks' ? '★ Закладки' : '🕘 История';
  const body = $('#panel-body');
  body.innerHTML = '';
  let items = kind === 'bookmarks' ? bookmarks : (await api.store.get('history')).slice().reverse().slice(0, 300);
  if (kind === 'history' && items.length) {
    const clr = el('button', 'btn ghost', 'Очистить историю');
    clr.onclick = () => { api.store.set('history', []); renderList('history'); };
    body.appendChild(clr);
  }
  if (!items.length) { body.appendChild(el('div', 'empty', kind === 'bookmarks' ? 'Закладок пока нет — жми ★ в адресной строке' : 'История пуста')); return; }
  for (const it of items) {
    const row = el('div', 'li');
    const t = el('div', 't'); t.append(el('b', '', it.title || it.url), el('small', '', it.url));
    row.appendChild(t);
    if (kind === 'bookmarks') {
      const d = el('button', 'ib sm'); d.innerHTML = ic('trash', 15);
      d.onclick = (e) => { e.stopPropagation(); bookmarks = bookmarks.filter((b) => b.url !== it.url); api.store.set('bookmarks', bookmarks); renderTiles(); syncUi(); renderList('bookmarks'); };
      row.appendChild(d);
    }
    row.onclick = () => { const a = active(); if (a && a.blank) api.go(a.id, it.url); else api.newTab(it.url); };
    body.appendChild(row);
  }
}

// ── редактор тем (живой предпросмотр) ──
function renderThemePanel() {
  $('#panel-title').textContent = '🎨 Редактор тем';
  const body = $('#panel-body');
  body.innerHTML = '';
  const orig = { ...theme };
  const d = { ...theme }; Object.keys(d).forEach((k) => k.startsWith('_') && delete d[k]);
  let saved = false;
  panelCleanup = () => { if (!saved) applyTheme(orig); };
  const upd = () => applyTheme(d);

  const f1 = el('div', 'fld'); f1.appendChild(el('label', '', 'Название'));
  const name = el('input', 'txt'); name.value = d.name; name.oninput = () => { d.name = name.value; };
  f1.appendChild(name); body.appendChild(f1);

  const f2 = el('div', 'fld'); f2.appendChild(el('label', '', 'Анимированный фон (mp4 / gif)'));
  const grid = el('div', 'bgs');
  const drawBgs = () => {
    grid.innerHTML = '';
    const none = el('button', 'bgt' + (!d.background ? ' sel' : ''), '');
    none.appendChild(el('span', '', 'нет')); none.onclick = () => { d.background = ''; drawBgs(); upd(); };
    grid.appendChild(none);
    for (const b of backgrounds) {
      const t = el('button', 'bgt' + (b.stem === d.background ? ' sel' : ''));
      let m;
      if (b.video) { m = document.createElement('video'); m.muted = true; m.loop = true; m.preload = 'metadata'; m.src = b.url; t.onmouseenter = () => m.play().catch(() => {}); t.onmouseleave = () => m.pause(); } else { m = document.createElement('img'); m.src = b.url; }
      t.append(m, el('span', '', b.stem));
      t.onclick = () => { d.background = b.stem; drawBgs(); upd(); };
      grid.appendChild(t);
    }
    const add = el('button', 'bgt', ''); add.appendChild(el('span', '', '＋ свой'));
    add.onclick = async () => { const r = await api.themes.addBg(); backgrounds = r.backgrounds; if (r.added) { d.background = r.added; upd(); } drawBgs(); };
    grid.appendChild(add);
  };
  drawBgs(); f2.appendChild(grid); body.appendChild(f2);

  const f3 = el('div', 'fld'); f3.appendChild(el('label', '', 'Цвета'));
  const cg = el('div', 'colors');
  for (const [k, lbl] of [['bg', 'Фон'], ['panel', 'Панели'], ['accent', 'Акцент'], ['accent2', 'Акцент 2'], ['text', 'Текст'], ['text_dim', 'Доп. текст']]) {
    const c = el('label', 'color'); const i = document.createElement('input'); i.type = 'color'; i.value = d[k];
    i.oninput = () => { d[k] = i.value; upd(); };
    c.append(i, el('span', '', lbl)); cg.appendChild(c);
  }
  f3.appendChild(cg); body.appendChild(f3);

  const slider = (key, lbl, min, max, step, fmt) => {
    const f = el('div', 'fld'); const l = el('label', ''); const v = el('span', '', fmt(d[key])); l.append(el('span', '', lbl), v);
    const r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = d[key];
    r.oninput = () => { d[key] = Number(r.value); v.textContent = fmt(d[key]); upd(); };
    f.append(l, r); body.appendChild(f);
  };
  slider('radius', 'Скругление', 0, 32, 1, (v) => v + 'px');
  slider('blur', 'Размытие стекла', 0, 40, 1, (v) => v + 'px');
  slider('panel_opacity', 'Прозрачность панелей', 0, 1, 0.01, (v) => Math.round(v * 100) + '%');
  slider('overlay_opacity', 'Затемнение фона', 0, 0.9, 0.01, (v) => Math.round(v * 100) + '%');

  const f4 = el('div', 'fld'); f4.appendChild(el('label', '', 'Шрифт'));
  const font = el('input', 'txt'); font.setAttribute('list', 'fonts'); font.value = d.font;
  const dl = document.createElement('datalist'); dl.id = 'fonts'; FONTS.forEach((x) => { const o = document.createElement('option'); o.value = x; dl.appendChild(o); });
  font.oninput = () => { d.font = font.value || 'Segoe UI'; upd(); };
  f4.append(font, dl); body.appendChild(f4);

  const f5 = el('label', 'chk fld'); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!d.style_web;
  cb.onchange = () => { d.style_web = cb.checked; upd(); };
  f5.append(cb, el('span', '', 'Красить скроллбары и выделение на сайтах')); body.appendChild(f5);

  const row = el('div', 'row');
  const save = el('button', 'btn', '💾 Сохранить');
  save.onclick = async () => {
    d.name = (d.name || '').trim() || 'Моя тема';
    themes = await api.themes.save(d); saved = true; await selectTheme(d.name); closePanel(); toast('Тема «' + d.name + '» сохранена ✿');
  };
  const del = el('button', 'btn danger', 'Удалить');
  del.onclick = async () => { if (themes.length < 2) return toast('Нельзя удалить последнюю тему'); themes = await api.themes.remove(orig.name); saved = true; await selectTheme(themes[0].name); closePanel(); };
  row.append(save, del); body.appendChild(row);
  body.appendChild(el('div', 'empty', 'Сменил название — получится новая тема. Файлы лежат в папке themes/'));
}

// ───────────── поиск на странице ─────────────
function toggleFind() {
  const fb = $('#findbar');
  if (fb.hidden) { fb.hidden = false; $('#find-in').focus(); $('#find-in').select(); } else closeFind();
}
function closeFind() { $('#findbar').hidden = true; api.findStop(); $('#find-count').textContent = ''; }
$('#find-in').addEventListener('input', () => api.find($('#find-in').value, true, false));
$('#find-in').addEventListener('keydown', (e) => { if (e.key === 'Enter') api.find($('#find-in').value, !e.shiftKey, true); if (e.key === 'Escape') closeFind(); });
$('#find-next').onclick = () => api.find($('#find-in').value, true, true);
$('#find-prev').onclick = () => api.find($('#find-in').value, false, true);
$('#find-close').onclick = closeFind;
api.on('found', (r) => { $('#find-count').textContent = r.total ? `${r.active}/${r.total}` : 'нет'; });

// ───────────── горячие клавиши (приходят из main) ─────────────
api.on('cmd', (c) => {
  const t = active();
  const step = (d) => { const i = state.tabs.findIndex((x) => x.id === state.activeId); const n = state.tabs[(i + d + state.tabs.length) % state.tabs.length]; if (n) api.switchTab(n.id); };
  ({
    newtab: () => api.newTab(), closetab: () => t && api.closeTab(t.id),
    focusurl: () => { $('#url').focus(); }, find: toggleFind, bookmark: toggleBookmark,
    reload: () => t && api.reload(t.id), history: () => openPanel('history'), bookmarks: () => openPanel('bookmarks'), themes: () => openPanel('theme'),
    nexttab: () => step(1), prevtab: () => step(-1), zoomin: () => api.zoom(0.1), zoomout: () => api.zoom(-0.1), zoomreset: () => api.zoom(0),
    fullscreen: () => api.win.fullscreen(), devtools: () => api.devtools(), back: () => t && api.back(t.id), forward: () => t && api.forward(t.id),
    escape: () => { closePopups(); if (!$('#findbar').hidden) closeFind(); },
  }[c] || (() => {}))();
});

// ───────────── горячая перезагрузка тем/фонов ─────────────
api.on('themes:changed', async () => {
  await reloadThemes();
  if (panelKind === 'theme') return;
  const t = themes.find((x) => x.name === theme.name) || themes[0];
  curBgUrl = null; applyTheme(t);
});

// ───────────── старт ─────────────
(async function init() {
  buildSparkles(); tickClock(); setInterval(tickClock, 5000);
  await reloadThemes();
  bookmarks = await api.store.get('bookmarks');
  applyTheme(themes.find((t) => t.name === settings.theme) || themes[0]);
  renderTiles(); syncUi(); sendBounds();
})();
