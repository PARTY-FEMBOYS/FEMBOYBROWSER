'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const inv = (c, ...a) => ipcRenderer.invoke(c, ...a);
const EVENTS = ['state', 'cmd', 'toast', 'themes:changed', 'win:state', 'found'];

contextBridge.exposeInMainWorld('api', {
  newTab: (url) => inv('tab:new', url),
  closeTab: (id) => inv('tab:close', id),
  switchTab: (id) => inv('tab:switch', id),
  moveTab: (id, i) => inv('tab:move', id, i),
  go: (id, input) => inv('nav:go', id, input),
  back: (id) => inv('nav:back', id),
  forward: (id) => inv('nav:forward', id),
  reload: (id) => inv('nav:reload', id),
  stop: (id) => inv('nav:stop', id),
  home: (id) => inv('nav:home', id),
  setBounds: (r) => inv('layout:bounds', r),
  freeze: () => inv('view:freeze'),
  unfreeze: () => inv('view:unfreeze'),
  win: { min: () => inv('win:min'), max: () => inv('win:max'), close: () => inv('win:close'), fullscreen: () => inv('win:fullscreen') },
  find: (text, forward = true, next = false) => inv('find', text, forward, next),
  findStop: () => inv('find:stop'),
  zoom: (d) => inv('zoom', d),
  devtools: () => inv('devtools'),
  store: { get: (k) => inv('store:get', k), set: (k, v) => inv('store:set', k, v) },
  themes: {
    list: () => inv('themes:list'),
    save: (t) => inv('themes:save', t),
    remove: (n) => inv('themes:remove', n),
    addBg: () => inv('bg:add'),
  },
  openFolder: (w) => inv('open:folder', w),
  setWebStyle: (o) => inv('webcss:set', o),
  quit: () => inv('app:quit'),
  on: (ch, fn) => { if (EVENTS.includes(ch)) ipcRenderer.on(ch, (_e, ...a) => fn(...a)); },
});
