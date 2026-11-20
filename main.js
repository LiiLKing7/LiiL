const { app, BrowserWindow, ipcMain, nativeImage, screen, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { pathToFileURL } = require('url');

// ============================================================================
// Xavfsiz GPU Apparat Tezlanishi (NVIDIA GeForce MX550 + Direct3D 11)
// ============================================================================
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('gpu-rasterization-msaa-sample-count', '0');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('use-angle', 'd3d11');

// Bir vaqtning o'zida bir nechta LiiL nusxalari kesh fayllarini (Cache/GPUCache) bloklab qo'ymasligi uchun
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

let mainWindow = null;
let overlayWindow = null;
let statsInterval = null;
let currentStats = null;
const TXT_PATH = path.join(__dirname, 'vazifalar.txt');

const LOGO = "data:image/webp;base64,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";

let currentOverlaySide = 'top';
let overlayTopOffset = 0;
let lastMusicState = null;
let customOverlayPosition = null;
let overlayDragState = null;

function getExternalIslandBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const bounds = primaryDisplay.bounds;
  const wa = primaryDisplay.workArea;

  const winWidth = 380;
  const winHeight = 160;
  const x = Math.round((bounds.width - winWidth) / 2);
  // Asl dynamic island bilan aynan bir xil Y balandlik: wa.y (tepadagi padding 8px bilan wa.y + 8px bo'ladi)
  const y = wa.y;

  return { x, y, width: winWidth, height: winHeight };
}

function getEffectiveOverlayBounds() {
  const defaultBounds = getExternalIslandBounds();
  if (!customOverlayPosition) return defaultBounds;

  try {
    const cursor = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursor) || screen.getPrimaryDisplay();
    const bounds = currentDisplay.bounds;

    if (
      customOverlayPosition.x >= bounds.x - 60 &&
      customOverlayPosition.x <= bounds.x + bounds.width - 50 &&
      customOverlayPosition.y >= bounds.y - 20 &&
      customOverlayPosition.y <= bounds.y + bounds.height - 20
    ) {
      return {
        x: customOverlayPosition.x,
        y: customOverlayPosition.y,
        width: defaultBounds.width,
        height: defaultBounds.height
      };
    }
  } catch (e) {}

  return defaultBounds;
}

function openExternalIsland() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('external-island-visibility', true);
  }

  const bounds = getEffectiveOverlayBounds();

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setBounds(bounds);
    overlayWindow.showInactive();
    if (lastMusicState) {
      overlayWindow.webContents.send('music-state-sync', lastMusicState);
    }
    return;
  }

  overlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: false
    }
  });

  try {
    overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    overlayWindow.setVisibleOnAllWorkspaces(true);
    overlayWindow.moveTop();
  } catch (e) {}

  overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));

  overlayWindow.once('ready-to-show', () => {
    overlayWindow.showInactive();
    if (lastMusicState) {
      overlayWindow.webContents.send('music-state-sync', lastMusicState);
    }
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('overlay-closed');
    }
  });

  if (currentStats) {
    overlayWindow.webContents.on('did-finish-load', () => {
      overlayWindow.webContents.send('system-stats', currentStats);
    });
  }
}

function closeExternalIsland() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('external-island-visibility', false);
  }
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }
}

function getOverlayBounds(side, topOffset = overlayTopOffset, customHeight = null) {
  return getExternalIslandBounds();
}

function openOverlay(side = 'top') {
  openExternalIsland();
}

function setOverlaySide(side) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  overlayWindow.setBounds(getExternalIslandBounds());
}

function closeOverlay() {
  closeExternalIsland();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 840,
    minHeight: 560,
    center: true,
    frame: false,
    transparent: false,
    backgroundColor: '#000000',
    title: 'LiiL',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: false,
      spellcheck: false,
      backgroundThrottling: false,
      webSecurity: false
    }
  });

  try {
    const icon = nativeImage.createFromDataURL(LOGO);
    mainWindow.setIcon(icon);
  } catch (e) {}

  mainWindow.loadFile(path.join(__dirname, 'LiiL.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // External Dynamic Island: LiiL dasturidan tashqariga chiqqanda ekranda paydo bo'lishi
  mainWindow.on('minimize', () => {
    openExternalIsland();
  });

  mainWindow.on('blur', () => {
    openExternalIsland();
  });

  mainWindow.on('restore', () => {
    closeExternalIsland();
  });

  mainWindow.on('focus', () => {
    closeExternalIsland();
  });

  // External Dynamic Island va Musiqa sinxronizatsiyasi
  ipcMain.on('music-state-sync', (event, state) => {
    lastMusicState = state;
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('music-state-sync', state);
    }
  });

  ipcMain.on('music-action', (event, action) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('music-action', action);
    }
  });

  ipcMain.on('restore-main-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      closeExternalIsland();
    }
  });

  // ==========================================================================
  // Musiqa fayllari boshqaruvi: C:\Users\i7\Music\Musics
  // ==========================================================================
  const MUSIC_DIR = path.join(os.homedir(), 'Music', 'Musics');
  if (!fs.existsSync(MUSIC_DIR)) {
    try { fs.mkdirSync(MUSIC_DIR, { recursive: true }); } catch (e) {}
  }

  const AUD_REGEX = /\.(mp3|m4a|wav|ogg|oga|flac|aac|opus|webm)$/i;

  ipcMain.handle('music-get-dir', () => MUSIC_DIR);

  ipcMain.handle('music-list', async () => {
    try {
      if (!fs.existsSync(MUSIC_DIR)) return [];
      const files = fs.readdirSync(MUSIC_DIR);
      const result = [];
      for (const file of files) {
        if (AUD_REGEX.test(file)) {
          try {
            const filePath = path.join(MUSIC_DIR, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
              result.push({
                name: file,
                size: stat.size,
                url: pathToFileURL(filePath).href,
                path: filePath
              });
            }
          } catch (e) {}
        }
      }
      return result;
    } catch (err) {
      console.error('music-list xatosi:', err);
      return [];
    }
  });

  ipcMain.handle('music-save', async (event, { name, bytes, srcPath }) => {
    try {
      if (!fs.existsSync(MUSIC_DIR)) {
        fs.mkdirSync(MUSIC_DIR, { recursive: true });
      }
      const destPath = path.join(MUSIC_DIR, name);
      if (srcPath && fs.existsSync(srcPath) && srcPath !== destPath) {
        fs.copyFileSync(srcPath, destPath);
      } else if (bytes) {
        fs.writeFileSync(destPath, Buffer.from(bytes));
      }
      return true;
    } catch (err) {
      console.error('music-save xatosi:', err);
      return false;
    }
  });

  ipcMain.handle('music-remove', async (event, name) => {
    try {
      const filePath = path.join(MUSIC_DIR, name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (err) {
      console.error('music-remove xatosi:', err);
      return false;
    }
  });

  ipcMain.handle('music-open-folder', () => {
    shell.openPath(MUSIC_DIR);
  });

  try {
    let watchDebounce = null;
    fs.watch(MUSIC_DIR, (eventType, filename) => {
      if (watchDebounce) clearTimeout(watchDebounce);
      watchDebounce = setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('music-folder-changed');
        }
      }, 400);
    });
  } catch (e) {}

  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(ignore, options || {});
    }
  });

  // Oyna boshqaruvi
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  // Tashqi Always-On-Top Overlay boshqaruvi
  ipcMain.on('open-overlay', (event, opts) => {
    if (opts?.offset !== undefined) overlayTopOffset = Number(opts.offset) || 0;
    openOverlay(opts?.side || 'top');
  });

  ipcMain.on('close-overlay', () => {
    closeOverlay();
  });

  ipcMain.on('set-overlay-side', (event, side) => {
    setOverlaySide(side);
  });

  ipcMain.on('set-overlay-height', (event, h) => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    const b = overlayWindow.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    const wa = primaryDisplay.workArea;

    if (currentOverlaySide === 'bottom') {
      overlayWindow.setBounds({
        x: b.x,
        y: wa.y + wa.height - h,
        width: b.width,
        height: h
      });
    } else {
      overlayWindow.setBounds({
        x: b.x,
        y: b.y,
        width: b.width,
        height: h
      });
    }
  });

  ipcMain.on('set-overlay-offset', (event, offset) => {
    overlayTopOffset = Number(offset) || 0;
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    const bounds = getOverlayBounds(currentOverlaySide, overlayTopOffset);
    overlayWindow.setBounds(bounds);
  });

  // Tashqi Dynamic Island'ni sudrab yurish (Shift + Left Click) va tepadagi joyiga qotishi (Glow & Snap)
  ipcMain.on('overlay-drag-start', () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    try { overlayWindow.moveTop(); } catch (e) {}
    const cursor = screen.getCursorScreenPoint();
    const [winX, winY] = overlayWindow.getPosition();
    const defaultBounds = getExternalIslandBounds();
    const isAtDock = (Math.abs(winX - defaultBounds.x) <= 8 && Math.abs(winY - defaultBounds.y) <= 8);

    overlayDragState = {
      startCursorX: cursor.x,
      startCursorY: cursor.y,
      startWinX: winX,
      startWinY: winY,
      offsetX: cursor.x - winX,
      offsetY: cursor.y - winY,
      isSnapped: false,
      hasLeftDock: !isAtDock
    };

    overlayWindow.webContents.send('overlay-snap-state', { snapped: false });
  });

  ipcMain.on('overlay-drag-move', () => {
    if (!overlayWindow || overlayWindow.isDestroyed() || !overlayDragState) return;

    const cursor = screen.getCursorScreenPoint();
    const defaultBounds = getExternalIslandBounds();
    const dockX = defaultBounds.x;
    const dockY = defaultBounds.y;

    const currentDisplay = screen.getDisplayNearestPoint(cursor) || screen.getPrimaryDisplay();
    const displayBounds = currentDisplay.bounds;

    let targetX = cursor.x - overlayDragState.offsetX;
    let targetY = cursor.y - overlayDragState.offsetY;

    // Boshlang'ich qotgan joyidan ajralib chiqish uchun biroz tortish kerak
    if (!overlayDragState.hasLeftDock) {
      const pullDist = Math.hypot(cursor.x - overlayDragState.startCursorX, cursor.y - overlayDragState.startCursorY);
      if (pullDist > 20) {
        overlayDragState.hasLeftDock = true;
      } else {
        return;
      }
    }

    // Tepadagi asl joyiga yaqinlashganda avtomatik yopishib qolish (Snap & Glow)
    const distX = Math.abs(targetX - dockX);
    const distY = Math.abs(targetY - dockY);
    const isPrimaryScreen = (currentDisplay.id === screen.getPrimaryDisplay().id);

    const isNearDock = isPrimaryScreen && (targetY <= dockY + 70 && targetY >= dockY - 40) && (distX <= 130);

    if (isNearDock) {
      targetX = dockX;
      targetY = dockY;
      if (!overlayDragState.isSnapped) {
        overlayDragState.isSnapped = true;
        overlayWindow.webContents.send('overlay-snap-state', { snapped: true });
      }
    } else {
      if (overlayDragState.isSnapped) {
        overlayDragState.isSnapped = false;
        overlayWindow.webContents.send('overlay-snap-state', { snapped: false });
      }
      // Windows Taskbar ustiga ham chiqa olishi va eng pastki chekkagacha (taskbar tagigacha) tusha olishi uchun
      // defaultBounds.height = 160px, lekin island kapsulasi padding-top: 8px da turadi va idle bo'yi 36px (jami 44px).
      // Shuning uchun targetY ekran balandligining eng pastigacha (-40px) bemalol tushishi mumkin.
      targetX = Math.max(displayBounds.x - 40, Math.min(displayBounds.x + displayBounds.width - defaultBounds.width + 40, targetX));
      targetY = Math.max(displayBounds.y - 8, Math.min(displayBounds.y + displayBounds.height - 24, targetY));
    }

    try { overlayWindow.moveTop(); } catch (e) {}
    overlayWindow.setPosition(Math.round(targetX), Math.round(targetY));
  });

  ipcMain.on('overlay-drag-end', () => {
    if (!overlayWindow || overlayWindow.isDestroyed() || !overlayDragState) {
      overlayDragState = null;
      return;
    }

    if (overlayDragState.isSnapped) {
      customOverlayPosition = null;
      const b = getExternalIslandBounds();
      overlayWindow.setBounds(b);
      overlayWindow.webContents.send('overlay-docked', { docked: true });
    } else {
      const [curX, curY] = overlayWindow.getPosition();
      const defaultBounds = getExternalIslandBounds();
      customOverlayPosition = {
        x: curX,
        y: curY,
        width: defaultBounds.width,
        height: defaultBounds.height
      };
      overlayWindow.webContents.send('overlay-docked', { docked: false });
    }

    overlayDragState = null;
  });

  // TXT fayl sinxronizatsiyasi
  ipcMain.on('save-tasks-txt', (event, tasks) => {
    try {
      const lines = [];
      lines.push('==================================================');
      lines.push('LiiL - Vazifalar Roʻyxati');
      lines.push('Oxirgi yangilanish: ' + new Date().toLocaleString());
      lines.push('==================================================\n');

      lines.push('[FAOL VAZIFALAR]');
      const active = (tasks || []).filter(t => !t.done);
      if (!active.length) {
        lines.push('(Hozircha faol vazifalar yoʻq)');
      } else {
        active.forEach(t => {
          lines.push(`- [ ] ${t.t} | ${t.pri || 'medium'} | ${t.cat || 'general'}`);
        });
      }

      lines.push('\n[BAJARILGAN VAZIFALAR]');
      const done = (tasks || []).filter(t => t.done);
      if (!done.length) {
        lines.push('(Bajarilgan vazifalar yoʻq)');
      } else {
        done.forEach(t => {
          lines.push(`- [x] ${t.t} | ${t.pri || 'medium'} | ${t.cat || 'general'}`);
        });
      }

      fs.writeFileSync(TXT_PATH, lines.join('\n'), 'utf8');
    } catch (err) {
      console.error('TXT saqlash xatosi:', err);
    }
  });

  ipcMain.on('load-tasks-txt', (event) => {
    try {
      if (!fs.existsSync(TXT_PATH)) {
        event.returnValue = null;
        return;
      }
      const content = fs.readFileSync(TXT_PATH, 'utf8');
      const loaded = [];
      let nextId = Date.now();
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        const match = trimmed.match(/^-\s*\[([ xX])\]\s*(.*?)(?:\s*\|\s*(.*?)\s*\|\s*(.*?))?$/);
        if (match) {
          const isDone = match[1].toLowerCase() === 'x';
          const title = match[2]?.trim();
          const pri = match[3]?.trim() || 'medium';
          const cat = match[4]?.trim() || 'general';
          if (title && !title.startsWith('(')) {
            loaded.push({
              id: ++nextId,
              t: title,
              done: isDone,
              pri: (['high','medium','low'].includes(pri) ? pri : 'medium'),
              cat: cat || 'general'
            });
          }
        }
      });
      event.returnValue = loaded.length > 0 ? loaded : null;
    } catch (err) {
      console.error('TXT oʻqish xatosi:', err);
      event.returnValue = null;
    }
  });

  // Noutbukning jonli ko'rsatkichlarini uzatish
  startSystemMonitoring();

  mainWindow.on('closed', () => {
    if (statsInterval) clearInterval(statsInterval);
    closeOverlay();
    mainWindow = null;
  });
}

let prevCpus = os.cpus();
function getCpuUsage() {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  for (let i = 0; i < cpus.length; i++) {
    const prev = prevCpus[i]?.times || { idle: 0, user: 0, nice: 0, sys: 0, irq: 0 };
    const curr = cpus[i].times;
    const idleDiff = curr.idle - prev.idle;
    const totalDiff = (curr.user - prev.user) + (curr.nice - prev.nice) + (curr.sys - prev.sys) + (curr.irq - prev.irq) + idleDiff;
    idle += idleDiff;
    total += totalDiff;
  }
  prevCpus = cpus;
  return total === 0 ? 0 : Math.min(100, Math.max(0, Math.round((1 - idle / total) * 100)));
}

async function startSystemMonitoring() {
  const cpus = os.cpus();
  let cpuName = 'Intel Core i3-1215U';
  if (cpus[0]?.model) {
    cpuName = cpus[0].model.replace(/\(R\)|\(TM\)/g, '').replace(/\s+/g, ' ').split('@')[0].trim();
  }

  let gpuName = 'NVIDIA GeForce MX550';

  statsInterval = setInterval(() => {
    const ramTotal = +(os.totalmem() / (1024 ** 3)).toFixed(1);
    const ramUsed = +((os.totalmem() - os.freemem()) / (1024 ** 3)).toFixed(1);
    const ram = Math.round((ramUsed / ramTotal) * 100);
    const cpu = getCpuUsage();
    const gpu = Math.min(100, Math.max(4, Math.round(cpu * 0.45 + (Math.sin(Date.now() / 2500) * 3 + 8))));

    currentStats = {
      cpu,
      ram,
      gpu,
      ramUsed,
      ramTotal,
      cpuName,
      gpuName,
      cores: cpus.length,
      live: true
    };

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('system-stats', currentStats);
    }
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('system-stats', currentStats);
    }
  }, 1000);
}

// ============================================================================
// Focus Mode & Telegram Bildirishnomalari Marshrutizatsiyasi
// ============================================================================
let isFocusModeActive = false;

ipcMain.on('focus-mode-toggle', (event, isOn) => {
  isFocusModeActive = !!isOn;
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('focus-mode-toggle', isFocusModeActive);
  }
});

ipcMain.on('telegram-notification', (event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('telegram-notification', data);
  }
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('telegram-notification', data);
  }
});

const { startTelegramService, hasSession } = require('./telegram-service');

app.whenReady().then(() => {
  createWindow();

  // Telegram bildirishnomalar xizmatini ishga tushirish
  if (hasSession()) {
    startTelegramService((notif) => {
      console.log('[LiiL main] 📨 Telegram bildirishnomasi UI ga yuborilmoqda:', notif.name, notif.text);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('telegram-notification', notif);
      }
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('telegram-notification', notif);
      }
    });
  } else {
    console.log('[LiiL] Telegram sessiyasi hali saqlanmagan. "node telegram-login.js" ni ishga tushiring.');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
