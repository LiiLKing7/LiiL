const { ipcRenderer } = require('electron');

// Oynani boshqarish tugmalari uchun (Kichraytirish, Kengaytirish, Yopish, Tashqi Overlay)
window.appWindow = {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  openOverlay: (opts) => ipcRenderer.send('open-overlay', opts),
  closeOverlay: () => ipcRenderer.send('close-overlay'),
  setOverlaySide: (side) => ipcRenderer.send('set-overlay-side', side),
  setOverlayHeight: (height) => ipcRenderer.send('set-overlay-height', height),
  setOverlayOffset: (offset) => ipcRenderer.send('set-overlay-offset', offset)
};

// TXT fayl bilan sinxronizatsiya (vazifalar.txt)
window.txtStorage = {
  saveTasks: (tasks) => ipcRenderer.send('save-tasks-txt', tasks),
  loadTasks: () => ipcRenderer.sendSync('load-tasks-txt')
};

// C:\Users\i7\Music\Musics papkasi bilan to'liq musiqa fayllari boshqaruvi
window.musicStorage = {
  getDir: () => ipcRenderer.invoke('music-get-dir'),
  list: () => ipcRenderer.invoke('music-list'),
  save: (name, bytes, srcPath) => ipcRenderer.invoke('music-save', { name, bytes, srcPath }),
  remove: (name) => ipcRenderer.invoke('music-remove', name),
  openFolder: () => ipcRenderer.invoke('music-open-folder'),
  onFolderChanged: (cb) => {
    ipcRenderer.on('music-folder-changed', () => {
      if (typeof cb === 'function') cb();
    });
  }
};

// External Dynamic Island va Musiqa sinxronizatsiyasi
window.islandBridge = {
  onOverlayVisibility: (cb) => {
    ipcRenderer.on('external-island-visibility', (event, isActive) => {
      if (typeof cb === 'function') cb(isActive);
    });
  }
};

window.musicSync = {
  sendState: (state) => ipcRenderer.send('music-state-sync', state),
  onAction: (cb) => {
    ipcRenderer.on('music-action', (event, action) => {
      if (typeof cb === 'function') cb(action);
    });
  }
};

window.externalIsland = {
  onSync: (cb) => {
    ipcRenderer.on('music-state-sync', (event, state) => {
      if (typeof cb === 'function') cb(state);
    });
  },
  sendAction: (action) => ipcRenderer.send('music-action', action),
  restoreApp: () => ipcRenderer.send('restore-main-window'),
  setIgnoreMouseEvents: (ignore, opts) => ipcRenderer.send('set-ignore-mouse-events', ignore, opts),
  startDrag: (pos) => ipcRenderer.send('overlay-drag-start', pos),
  moveDrag: (pos) => ipcRenderer.send('overlay-drag-move', pos),
  endDrag: () => ipcRenderer.send('overlay-drag-end'),
  onSnapState: (cb) => {
    ipcRenderer.on('overlay-snap-state', (event, data) => {
      if (typeof cb === 'function') cb(data);
    });
  },
  onDocked: (cb) => {
    ipcRenderer.on('overlay-docked', (event, data) => {
      if (typeof cb === 'function') cb(data);
    });
  }
};

// Noutbukning jonli CPU/RAM/GPU statistikasini qabul qilish
ipcRenderer.on('system-stats', (event, stats) => {
  if (typeof window.setSystemStats === 'function') {
    window.setSystemStats(stats);
  }
});

// Overlay holati o'zgarganda
ipcRenderer.on('overlay-closed', () => {
  if (typeof window.onOverlayClosed === 'function') {
    window.onOverlayClosed();
  }
});

ipcRenderer.on('overlay-side-changed', (event, side) => {
  if (typeof window.onOverlaySideChanged === 'function') {
    window.onOverlaySideChanged(side);
  }
});

// Telegram bildirishnomalari va Focus rejimi ko'prigi
window.ipcRenderer = ipcRenderer;

window.telegramBridge = {
  onNotification: (cb) => {
    ipcRenderer.on('telegram-notification', (event, data) => {
      if (typeof cb === 'function') cb(data);
    });
  },
  sendNotification: (data) => ipcRenderer.send('telegram-notification', data),
  toggleFocus: (isOn) => ipcRenderer.send('focus-mode-toggle', isOn),
  onFocusChanged: (cb) => {
    ipcRenderer.on('focus-mode-toggle', (event, isOn) => {
      if (typeof cb === 'function') cb(isOn);
    });
  }
};

// Asosiy jarayondan kelgan Telegram bildirishnomasini to'g'ridan-to'g'ri Focus UI ga uzatish
ipcRenderer.on('telegram-notification', (event, data) => {
  if (window.telegramFocus && typeof window.telegramFocus.arrive === 'function') {
    window.telegramFocus.arrive(data);
  }
});
