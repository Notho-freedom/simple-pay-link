/**
 * Cognitive Explorer — thin Electron shell.
 *
 * Architecture:
 *   1. Spawn the local HTTP API server (scripts/explorer-server.mjs) on 127.0.0.1.
 *   2. Open a BrowserWindow that loads the UI. The UI can be:
 *      - a remote HTTPS deployment (set APP_URL env, e.g. https://explorer.example.com)
 *      - the local dev server (default: http://127.0.0.1:8080)
 *   3. Pass system parameters (apiBase, platform, hostname, initialPath) as URL query
 *      so the UI never needs a direct IPC channel — everything flows through HTTP.
 *
 * This keeps the shell tiny and lets the UI ship independently of the desktop binary.
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

const API_PORT = Number(process.env.EXPLORER_API_PORT || 8081);
const APP_URL = process.env.APP_URL || '';

let serverProcess = null;
let mainWindow = null;

function loadTarget(win, folderId) {
  const target = buildLaunchUrl(folderId);
  console.log('[explorer-shell] loading', target);
  if (typeof target === 'string') win.loadURL(target);
  else win.loadFile(target.file, { hash: target.hash });
}

function startApiServer() {
  const serverScript = path.resolve(__dirname, '..', 'scripts', 'explorer-server.mjs');
  serverProcess = spawn(process.execPath, [serverScript], {
    env: { ...process.env, EXPLORER_API_PORT: String(API_PORT) },
    stdio: 'inherit',
  });
  serverProcess.on('exit', (code) => {
    console.log(`[explorer-shell] API server exited with code ${code}`);
    serverProcess = null;
  });
}

function stopApiServer() {
  if (!serverProcess) return;
  try { serverProcess.kill(); } catch { /* noop */ }
  serverProcess = null;
}

function buildLaunchUrl(folderId) {
  const apiBase = `http://127.0.0.1:${API_PORT}`;
  const params = new URLSearchParams({
    apiBase,
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    username: os.userInfo().username,
    homedir: os.homedir(),
    shell: 'electron',
    version: app.getVersion(),
  });
  if (folderId) params.set('folderId', String(folderId));
  const query = params.toString();

  if (!APP_URL) {
    return {
      file: path.resolve(__dirname, '..', 'dist', 'index.html'),
      hash: `/explorer?${query}`,
    };
  }

  const url = new URL(APP_URL);
  // We inject params after the hash so react-router (HashRouter) does not eat them.
  const marker = url.href.includes('#') ? '' : '#/explorer';
  const finalHref = url.href + marker;
  const sep = finalHref.includes('?') ? '&' : '?';
  return `${finalHref}${sep}${query}`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Cognitive Explorer',
    backgroundColor: '#0b0f14',
    frame: false,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.resolve(__dirname, 'shell-preload.cjs'),
    },
  });
  mainWindow.webContents.openDevTools({ mode: "detach" });

  loadTarget(mainWindow);

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.on('window:open-folder', (_event, folderId) => {
  const child = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    title: 'Cognitive Explorer',
    backgroundColor: '#0b0f14',
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.resolve(__dirname, 'shell-preload.cjs'),
    },
  });
  loadTarget(child, folderId);
});

app.whenReady().then(() => {
  startApiServer();
  // Give the server a small head-start so the UI's first fetch succeeds.
  setTimeout(createWindow, 400);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopApiServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', stopApiServer);
