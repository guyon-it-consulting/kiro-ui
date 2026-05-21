// Electron main process for Kiro UI
const { app, BrowserWindow, shell, nativeTheme } = require('electron');
const { join } = require('path');
const { fork, execSync } = require('child_process');
const fs = require('fs');

const isDev = !app.isPackaged;

// Fix PATH when launched from Finder (GUI apps get minimal PATH on macOS/Linux)
function fixPath() {
  if (process.platform === 'win32') return;
  try {
    const shell = process.env.SHELL || '/bin/zsh';
    const out = execSync(`${shell} -ilc 'echo $PATH'`, { encoding: 'utf8' }).trim();
    if (out) process.env.PATH = out;
  } catch {}
}
if (!isDev) fixPath();

// Simple JSON file store (no keychain access)
const stateFile = join(app.getPath('userData'), 'window-state.json');
function loadState() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { return {}; }
}
function saveState(data) {
  try { fs.writeFileSync(stateFile, JSON.stringify(data)); } catch {}
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
function getWindowState() {
  const state = loadState();
  return state.windowBounds || { width: 1200, height: 800 };
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const state = loadState();
  if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
    state.windowBounds = mainWindow.getBounds();
  }
  state.isMaximized = mainWindow.isMaximized();
  saveState(state);
}

// --- Kill stale process on port ---
function killProcessOnPort(port) {
  try {
    let pid;
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' });
      pid = out.trim().split(/\s+/).pop();
    } else {
      pid = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim();
    }
    if (pid) {
      if (process.platform === 'win32') {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      } else {
        process.kill(Number(pid), 'SIGKILL');
      }
      // Brief wait for OS to release the port
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    }
  } catch { /* no process on port, that's fine */ }
}

// --- Server management ---
function startServer() {
  return new Promise((resolve, reject) => {
    killProcessOnPort(SERVER_PORT);

    const serverScript = isDev
      ? join(__dirname, '..', 'server.ts')
      : join(process.resourcesPath, 'server.js');

    const serverCwd = isDev
      ? join(__dirname, '..')
      : process.resourcesPath;

    const execArgv = isDev ? ['--import', 'tsx/esm', '--max-old-space-size=1024'] : ['--max-old-space-size=1024'];

    serverProcess = fork(serverScript, [], {
      cwd: serverCwd,
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
  const bounds = getWindowState();
  const state = loadState();

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

  if (state.isMaximized) mainWindow.maximize();

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
  // Auto-updater removed — was causing keychain prompts and errors with no published releases

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
