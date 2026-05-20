// Electron main process for Kiro UI
const { app, BrowserWindow, shell, nativeTheme } = require('electron');
const { join } = require('path');
const { fork } = require('child_process');

const isDev = !app.isPackaged;
let store = null;

// Lazy-load electron-store (ESM module)
async function getStore() {
  if (!store) {
    const { default: Store } = await import('electron-store');
    store = new Store({ name: 'window-state' });
  }
  return store;
}

let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = 13713; // Unique port to avoid conflicts

// --- Single instance lock ---
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// --- Window state ---
async function getWindowState() {
  const s = await getStore();
  return s.get('windowBounds', { width: 1200, height: 800 });
}

async function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const s = await getStore();
  if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
    s.set('windowBounds', mainWindow.getBounds());
  }
  s.set('isMaximized', mainWindow.isMaximized());
}

// --- Server management ---
function startServer() {
  return new Promise((resolve, reject) => {
    const serverScript = isDev
      ? join(__dirname, '..', 'server.ts')
      : join(__dirname, '..', 'server.js');

    const execArgv = isDev ? ['--import', 'tsx/esm', '--max-old-space-size=1024'] : ['--max-old-space-size=1024'];

    serverProcess = fork(serverScript, [], {
      cwd: isDev ? join(__dirname, '..') : join(__dirname, '..'),
      execArgv,
      env: {
        ...process.env,
        KIRO_UI_PORT: String(SERVER_PORT),
        ELECTRON: '1',
        NODE_ENV: isDev ? 'development' : 'production',
      },
      silent: true,
    });

    let resolved = false;

    serverProcess.on('message', (msg) => {
      if (msg?.type === 'ready' && !resolved) {
        resolved = true;
        resolve(msg.port || SERVER_PORT);
      }
    });

    serverProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      if (!resolved && text.includes('running at')) {
        resolved = true;
        resolve(SERVER_PORT);
      }
      if (isDev) process.stdout.write(`[server] ${text}`);
    });

    serverProcess.stderr?.on('data', (data) => {
      if (isDev) process.stderr.write(`[server] ${data}`);
    });

    serverProcess.on('error', (err) => {
      if (!resolved) { resolved = true; reject(err); }
    });

    serverProcess.on('exit', (code) => {
      if (!resolved) { resolved = true; reject(new Error(`Server exited with code ${code}`)); }
      serverProcess = null;
    });

    // Timeout fallback
    setTimeout(() => {
      if (!resolved) { resolved = true; resolve(SERVER_PORT); }
    }, 5000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

// --- Window creation ---
async function createWindow() {
  const bounds = await getWindowState();
  const s = await getStore();

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#131313' : '#f7f7f8',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
      spellcheck: false,
    },
  });

  if (s.get('isMaximized')) mainWindow.maximize();

  mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}`);

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Add platform class for CSS adjustments (traffic light padding)
  mainWindow.webContents.on('did-finish-load', () => {
    if (process.platform === 'darwin') {
      mainWindow.webContents.executeJavaScript("document.body.classList.add('electron-mac')");
    }
  });

  // Persist window state
  ['resize', 'move', 'maximize', 'unmaximize'].forEach(event => {
    mainWindow.on(event, saveWindowState);
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // External links open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') || url.startsWith('vscode://') || url.startsWith('cursor://') || url.startsWith('idea://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Block navigation away from app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${SERVER_PORT}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

// --- Auto-updater ---
function setupAutoUpdater() {
  if (isDev) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  } catch { /* updater not configured */ }
}

// --- App lifecycle ---
app.whenReady().then(async () => {
  try {
    await startServer();
  } catch (err) {
    console.error('Failed to start server:', err);
    app.quit();
    return;
  }

  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    setTimeout(() => { if (serverProcess) serverProcess.kill('SIGKILL'); }, 3000);
  }
});

app.on('will-quit', () => stopServer());
