/**
 * Cognitive Explorer — local API server.
 *
 * Exposes a small HTTP surface used by the UI (browser or Electron shell) to talk
 * to the host filesystem, drives, network, GitHub, FTP sources, etc. The UI never
 * imports Node APIs directly — everything flows through this server so the same
 * bundle can run in a browser, dev preview, or embedded Electron window.
 */

import { createServer } from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { Client as FtpClient } from 'basic-ftp';

const exec = promisify(execCb);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.EXPLORER_API_PORT || process.env.PORT || 8081);
const configDir = path.join(os.homedir(), '.cognitive-explorer');
const configFile = path.join(configDir, 'sources.json');

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (err) { reject(err); }
    });
    req.on('error', reject);
  });
}

function expandHome(p) {
  if (!p) return p;
  if (p === '~') return os.homedir();
  if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(os.homedir(), p.slice(2));
  return p;
}

function safeCwd(value) {
  const candidate = expandHome(String(value || '').trim());
  if (!candidate) return os.homedir();
  try {
    const stat = fs.statSync(candidate);
    if (stat.isDirectory()) return candidate;
  } catch { /* invalid virtual explorer path */ }
  return os.homedir();
}

async function resolveCwd(current, target) {
  const base = safeCwd(current);
  let next = String(target || '').trim();
  next = next.replace(/^\/d\s+/i, '').trim();
  next = next.replace(/^['"]|['"]$/g, '');
  if (!next || next === '~') next = os.homedir();
  const resolved = path.resolve(base, expandHome(next));
  const stat = await fsp.stat(resolved);
  if (!stat.isDirectory()) throw new Error('Not a directory');
  return resolved;
}

function ensureConfigDir() {
  try { fs.mkdirSync(configDir, { recursive: true }); } catch { /* noop */ }
}

function loadSources() {
  ensureConfigDir();
  if (!fs.existsSync(configFile)) return [];
  try { return JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch { return []; }
}

async function getDefaultSources() {
  const sources = [{
    id: 'local-home',
    type: 'local',
    name: 'Dossier utilisateur',
    root: os.homedir(),
    status: 'connected',
    readOnly: false,
  }];

  const drives = await getDrives();
  for (const drive of drives) {
    const mountId = String(drive.mount).replace(/[^a-z0-9]/gi, '').toLowerCase() || sources.length;
    sources.push({
      id: `${drive.isNetwork ? 'network-drive' : 'local-drive'}-${mountId}`,
      type: drive.isNetwork ? 'network' : 'local',
      name: drive.displayName || drive.label || drive.mount,
      root: drive.mount,
      status: 'connected',
      readOnly: false,
      driveInfo: drive,
    });
  }

  return sources;
}

function sanitizeSource(source) {
  const { password, ...safe } = source;
  return safe;
}

async function getAllSources({ includeSecrets = false } = {}) {
  const defaults = await getDefaultSources();
  const saved = loadSources();
  const byId = new Map();
  for (const source of [...defaults, ...saved]) byId.set(source.id, source);
  const sources = Array.from(byId.values());
  return includeSecrets ? sources : sources.map(sanitizeSource);
}

function saveSources(list) {
  ensureConfigDir();
  fs.writeFileSync(configFile, JSON.stringify(list, null, 2), 'utf8');
}

function fileTypeFromName(name, isDirectory) {
  if (isDirectory) return 'folder';
  const ext = path.extname(name).slice(1).toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return 'audio';
  if (['js','jsx','ts','tsx','json','css','html','py','rs','go','java','md','yml','yaml'].includes(ext)) return 'code';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return 'archive';
  if (ext === 'pdf') return 'pdf';
  if (['doc','docx','rtf'].includes(ext)) return 'document';
  if (['xls','xlsx','csv'].includes(ext)) return 'spreadsheet';
  if (['txt','log'].includes(ext)) return 'text';
  return 'unknown';
}

function mimeFromName(name) {
  const ext = path.extname(name).slice(1).toLowerCase();
  const map = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4',
    txt: 'text/plain; charset=utf-8', md: 'text/markdown; charset=utf-8', json: 'application/json; charset=utf-8',
    pdf: 'application/pdf',
  };
  return map[ext] || 'application/octet-stream';
}

function resolveSourcePath(source, targetPath = '/') {
  const clean = String(targetPath || '/').replace(/^[/\\]+/, '');
  return path.resolve(expandHome(source.root || os.homedir()), clean);
}

// ---------------------------------------------------------------------------
// System info / drives / network
// ---------------------------------------------------------------------------

async function getSystemInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    username: os.userInfo().username,
    homedir: os.homedir(),
    tmpdir: os.tmpdir(),
    cpus: os.cpus().length,
    memory: { total: os.totalmem(), free: os.freemem() },
    uptime: os.uptime(),
  };
}

async function getDrives() {
  if (process.platform === 'win32') {
    try {
      const ps = [
        'Get-CimInstance Win32_LogicalDisk',
        'Select-Object DeviceID,VolumeName,FileSystem,Size,FreeSpace,DriveType,ProviderName',
        'ConvertTo-Json -Depth 3 -Compress',
      ].join(' | ');
      const { stdout } = await exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps}"`, { timeout: 7000 });
      const raw = JSON.parse(stdout || '[]');
      const disks = Array.isArray(raw) ? raw : [raw];
      return disks.map((disk) => {
        const caption = String(disk.DeviceID || '').trim();
        const total = Number(disk.Size) || 0;
        const freeBytes = Number(disk.FreeSpace) || 0;
        const used = Math.max(0, total - freeBytes);
        const mount = caption ? `${caption}\\` : '';
        const volumeName = String(disk.VolumeName || '').trim();
        const providerName = String(disk.ProviderName || '').trim();
        const driveType = Number(disk.DriveType) || 0;
        const isNetwork = driveType === 4;
        const label = volumeName || (isNetwork && providerName ? providerName.split(/[\\/]/).filter(Boolean).pop() : '') || (isNetwork ? 'Lecteur réseau' : 'Disque local');
        const displayName = `${label} (${caption})`;
        return {
          mount,
          label,
          displayName,
          total, used,
          usage: total > 0 ? (used / total) * 100 : 0,
          fsType: disk.FileSystem || undefined,
          driveType,
          providerName: providerName || undefined,
          isNetwork,
        };
      }).filter((d) => d.mount && (d.total > 0 || d.isNetwork));
    } catch (err) {
      const fallback = [];
      for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        const mount = `${letter}:\\`;
        try {
          fs.statSync(mount);
          const stat = fs.statfsSync(mount);
          const total = stat.blocks * stat.bsize;
          const free = stat.bavail * stat.bsize;
          const used = Math.max(0, total - free);
          fallback.push({
            mount,
            label: `Disque local`,
            displayName: `Disque local (${letter}:)`,
            total,
            used,
            usage: total > 0 ? (used / total) * 100 : 0,
            fsType: 'local',
            driveType: 3,
            isNetwork: false,
          });
        } catch {
          // Drive letter absent or inaccessible.
        }
      }
      return fallback;
    }
  }
  // POSIX: single "root" mount as fallback
  try {
    const stat = await fsp.statfs?.('/');
    if (stat) {
      const total = stat.blocks * stat.bsize;
      const free = stat.bavail * stat.bsize;
      const used = total - free;
      return [{ mount: '/', label: 'Système', total, used, usage: total ? (used/total)*100 : 0, fsType: 'posix' }];
    }
  } catch { /* noop */ }
  return [];
}

async function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const out = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs || []) {
      if (!addr.internal && addr.family === 'IPv4') {
        out.push({ name, address: addr.address, mac: addr.mac });
      }
    }
  }
  return { interfaces: out, hostname: os.hostname() };
}

async function getLocalServices() {
  const services = [];
  const seen = new Set();
  const push = (svc) => {
    const port = Number(svc.port);
    if (!port || seen.has(port)) return;
    seen.add(port);
    const protocol = svc.protocol || 'tcp';
    const name = svc.name || (port === 8080 ? 'Vite / Web app' : port === 8081 ? 'Explorer API' : `Service local ${port}`);
    services.push({
      id: `local-${protocol}-${port}`,
      name,
      port,
      protocol,
      framework: svc.framework || (port === 5432 ? 'PostgreSQL' : port === 6379 ? 'Redis' : port === 3306 ? 'MySQL' : port === 8080 ? 'Vite' : port === 8081 ? 'Node API' : 'TCP'),
      status: 'running',
      url: svc.url || `http://127.0.0.1:${port}`,
      pid: svc.pid || undefined,
      uptime: 'détecté maintenant',
      description: svc.description || 'Service réellement détecté sur cette machine.',
      routes: [],
    });
  };

  if (process.platform === 'win32') {
    try {
      const ps = `Get-NetTCPConnection -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json -Compress`;
      const { stdout } = await exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps}"`, { timeout: 6000 });
      const raw = JSON.parse(stdout || '[]');
      const rows = Array.isArray(raw) ? raw : [raw];
      for (const row of rows) {
        const port = Number(row.LocalPort);
        if (!port) continue;
        let proc = '';
        try {
          const r = await exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-Process -Id ${Number(row.OwningProcess)} -ErrorAction SilentlyContinue).ProcessName"`, { timeout: 1500 });
          proc = r.stdout.trim();
        } catch { /* noop */ }
        push({ port, pid: row.OwningProcess, name: proc ? `${proc} :${port}` : undefined, framework: proc || undefined });
      }
    } catch { /* fallback below */ }
  } else {
    try {
      const { stdout } = await exec('ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null || true', { timeout: 5000 });
      for (const line of stdout.split('\n')) {
        const m = /(?:LISTEN\s+\d+\s+\d+\s+)?(?:\S+:)(\d+)\s+.*?(?:pid=(\d+),|\/(\w+))?/.exec(line);
        if (!m) continue;
        const port = Number(m[1]);
        if (!port || port > 65535) continue;
        push({ port, pid: m[2], name: m[3] ? `${m[3]} :${port}` : undefined, framework: m[3] });
      }
    } catch { /* noop */ }
  }

  [Number(process.env.VITE_DEV_PORT) || 8080, port].forEach((p) => push({ port: p }));
  return services.sort((a, b) => a.port - b.port).slice(0, 80);
}

// ---------------------------------------------------------------------------
// Filesystem listing (local, ftp)
// ---------------------------------------------------------------------------

async function listLocalDir(targetPath, { showHidden = false } = {}) {
  const resolved = expandHome(targetPath);
  const entries = await fsp.readdir(resolved, { withFileTypes: true });
  const items = await Promise.all(entries.map(async (entry) => {
    if (!showHidden && entry.name.startsWith('.')) return null;
    const fullPath = path.join(resolved, entry.name);
    let stat = null;
    try { stat = await fsp.stat(fullPath); } catch { /* noop */ }
    return {
      name: entry.name,
      path: fullPath,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      size: stat?.size || 0,
      modified: stat?.mtime || null,
      type: fileTypeFromName(entry.name, entry.isDirectory()),
    };
  }));
  return items.filter(Boolean);
}

async function withFtpClient(source, worker) {
  const client = new FtpClient(8000);
  client.ftp.verbose = false;
  try {
    await client.access({
      host: source.host,
      port: source.port || 21,
      user: source.user || 'anonymous',
      password: source.password || 'anonymous@',
      secure: !!source.secure,
    });
    return await worker(client);
  } finally {
    client.close();
  }
}

async function testWebDav(source) {
  const base = String(source.host || '').trim();
  if (!/^https?:\/\//i.test(base)) throw new Error('WebDAV URL must start with http:// or https://');
  const headers = {};
  if (source.user || source.password) {
    headers.authorization = `Basic ${Buffer.from(`${source.user || ''}:${source.password || ''}`).toString('base64')}`;
  }
  const response = await fetch(base, { method: 'PROPFIND', headers: { ...headers, depth: '0' } });
  if (response.status >= 200 && response.status < 400) return true;
  if (response.status === 401 || response.status === 403) throw new Error('Identifiants WebDAV refusés');
  throw new Error(`WebDAV unavailable (${response.status})`);
}

function webDavUrl(source, targetPath = '/') {
  const base = new URL(String(source.host || ''));
  const root = String(source.root || source.path || '').replace(/^\/+|\/+$/g, '');
  const rel = String(targetPath || '/').replace(/^\/+|\/+$/g, '');
  const parts = [base.pathname.replace(/\/+$/g, ''), root, rel].filter(Boolean).join('/');
  base.pathname = `/${parts}`.replace(/\/+/g, '/');
  return base;
}

function tagText(xml, tag) {
  const re = new RegExp(`<[^:>]*:?${tag}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${tag}>`, 'i');
  return (re.exec(xml)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

function decodeXmlText(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function listWebDavDir(source, targetPath = '/') {
  const url = webDavUrl(source, targetPath);
  const headers = { depth: '1' };
  if (source.user || source.password) headers.authorization = `Basic ${Buffer.from(`${source.user || ''}:${source.password || ''}`).toString('base64')}`;
  const response = await fetch(url, { method: 'PROPFIND', headers });
  if (!response.ok && response.status !== 207) throw new Error(`WebDAV list failed (${response.status})`);
  const xml = await response.text();
  const chunks = xml.split(/<[^:>]*:?response[\s>]/i).slice(1);
  const currentHref = decodeURIComponent(url.pathname.replace(/\/+$/g, ''));
  const items = [];
  for (const chunk of chunks) {
    const href = decodeXmlText(tagText(chunk, 'href'));
    if (!href) continue;
    const decodedHref = decodeURIComponent(new URL(href, url).pathname.replace(/\/+$/g, ''));
    if (decodedHref === currentHref) continue;
    const fallback = decodedHref.split('/').filter(Boolean).pop() || 'item';
    const displayName = decodeXmlText(tagText(chunk, 'displayname')) || fallback;
    const isDirectory = /<[^:>]*:?collection\s*\/?\s*>/i.test(chunk);
    const size = Number(tagText(chunk, 'getcontentlength')) || 0;
    const modified = tagText(chunk, 'getlastmodified') || null;
    const parent = String(targetPath || '/').replace(/\/$/, '') || '';
    const itemPath = `${parent}/${displayName}`.replace(/\/+/g, '/');
    items.push({
      name: displayName,
      path: itemPath,
      isDirectory,
      isFile: !isDirectory,
      size,
      modified: modified ? new Date(modified) : null,
      type: fileTypeFromName(displayName, isDirectory),
    });
  }
  return items;
}

async function listFtpDir(source, targetPath = '/') {
  return withFtpClient(source, async (client) => {
    const entries = await client.list(targetPath);
    return entries.map((entry) => ({
      name: entry.name,
      path: `${targetPath.replace(/\/$/, '')}/${entry.name}`,
      isDirectory: entry.isDirectory,
      isFile: entry.isFile,
      size: entry.size || 0,
      modified: entry.modifiedAt || null,
      type: fileTypeFromName(entry.name, entry.isDirectory),
    }));
  });
}

// ---------------------------------------------------------------------------
// Shell / launch native apps
// ---------------------------------------------------------------------------

function openWithSystemDefault(target) {
  const cmd = process.platform === 'win32' ? 'start' :
              process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['', target] : [target];
  const child = spawn(cmd, args, { detached: true, stdio: 'ignore', shell: process.platform === 'win32' });
  child.unref();
  return { success: true };
}

// ---------------------------------------------------------------------------
// GitHub proxy (token-based). Accepts Authorization: Bearer <PAT>
// ---------------------------------------------------------------------------

async function githubProxy(subPath, req) {
  const auth = req.headers.authorization;
  if (!auth) return { status: 401, body: { error: 'Missing token' } };
  const target = `https://api.github.com${subPath.startsWith('/') ? '' : '/'}${subPath}`;
  try {
    const response = await fetch(target, {
      headers: {
        Authorization: auth,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'cognitive-explorer',
      },
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch (err) {
    return { status: 502, body: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

async function route(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const p = url.pathname;

  // ── System ────────────────────────────────────────────────────────────────
  if (req.method === 'GET' && p === '/api/system/info')     return json(res, 200, { success: true, data: await getSystemInfo() });
  if (req.method === 'GET' && p === '/api/system/drives')   return json(res, 200, { success: true, data: await getDrives() });
  if (req.method === 'GET' && p === '/api/system/network')  return json(res, 200, { success: true, data: await getNetworkInfo() });
  if (req.method === 'GET' && p === '/api/system/local-services') return json(res, 200, { success: true, data: await getLocalServices() });
  if (req.method === 'GET' && p === '/api/system/icon') {
    if (process.platform !== 'win32') return json(res, 200, { success: false, error: 'System icons are only implemented on Windows' });
    const targetPath = url.searchParams.get('path');
    if (!targetPath) return json(res, 400, { success: false, error: 'Missing path' });
    try {
      const psPath = targetPath.replace(/'/g, "''");
      const command = `
        Add-Type -AssemblyName System.Drawing;
        $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${psPath}');
        if ($null -eq $icon) { throw 'No icon' }
        $bmp = $icon.ToBitmap();
        $ms = New-Object System.IO.MemoryStream;
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png);
        [Convert]::ToBase64String($ms.ToArray());
      `;
      const { stdout } = await exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${command.replace(/\r?\n/g, ' ')}"`, { timeout: 5000 });
      const base64 = stdout.trim();
      if (!base64) throw new Error('Empty icon');
      return json(res, 200, { success: true, icon: `data:image/png;base64,${base64}` });
    } catch (err) {
      return json(res, 200, { success: false, error: err.message });
    }
  }

  // ── Filesystem ────────────────────────────────────────────────────────────
  if (req.method === 'GET' && p === '/api/fs/list') {
    const targetPath = url.searchParams.get('path') || os.homedir();
    const showHidden = url.searchParams.get('showHidden') === '1';
    try {
      const items = await listLocalDir(targetPath, { showHidden });
      return json(res, 200, { success: true, path: targetPath, items });
    } catch (err) {
      return json(res, 200, { success: false, path: targetPath, items: [], error: err.message });
    }
  }

  if (req.method === 'POST' && p === '/api/fs/mkdir') {
    const body = await readBody(req);
    try { await fsp.mkdir(expandHome(body.path), { recursive: true }); return json(res, 200, { success: true, path: body.path }); }
    catch (err) { return json(res, 200, { success: false, error: err.message }); }
  }
  if (req.method === 'POST' && p === '/api/fs/write') {
    const body = await readBody(req);
    try {
      const target = expandHome(body.path);
      await fsp.mkdir(path.dirname(target), { recursive: true });
      await fsp.writeFile(target, String(body.content || ''), body.overwrite === false ? { flag: 'wx' } : undefined);
      return json(res, 200, { success: true, path: body.path });
    }
    catch (err) { return json(res, 200, { success: false, error: err.message }); }
  }
  if (req.method === 'POST' && p === '/api/fs/rename') {
    const body = await readBody(req);
    try { await fsp.rename(expandHome(body.from), expandHome(body.to)); return json(res, 200, { success: true }); }
    catch (err) { return json(res, 200, { success: false, error: err.message }); }
  }
  if (req.method === 'POST' && p === '/api/fs/copy') {
    const body = await readBody(req);
    try { await fsp.cp(expandHome(body.from), expandHome(body.to), { recursive: true }); return json(res, 200, { success: true }); }
    catch (err) { return json(res, 200, { success: false, error: err.message }); }
  }
  if (req.method === 'POST' && p === '/api/fs/move') {
    const body = await readBody(req);
    try { await fsp.rename(expandHome(body.from), expandHome(body.to)); return json(res, 200, { success: true }); }
    catch (err) { return json(res, 200, { success: false, error: err.message }); }
  }
  if (req.method === 'POST' && p === '/api/fs/delete') {
    const body = await readBody(req);
    try { await fsp.rm(expandHome(body.path), { recursive: true, force: true }); return json(res, 200, { success: true }); }
    catch (err) { return json(res, 200, { success: false, error: err.message }); }
  }
  if (req.method === 'POST' && p === '/api/fs/open') {
    const body = await readBody(req);
    return json(res, 200, openWithSystemDefault(expandHome(body.path)));
  }

  if (req.method === 'POST' && p === '/api/terminal/exec') {
    const body = await readBody(req);
    const cwd = safeCwd(body.cwd || os.homedir());
    const command = String(body.command || '').trim();
    if (!command) return json(res, 200, { success: true, stdout: '', stderr: '', cwd });
    try {
      const shellName = process.platform === 'win32' ? 'powershell.exe' : '/bin/sh';
      const shellArgs = process.platform === 'win32'
        ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command]
        : ['-lc', command];
      const child = spawn(shellName, shellArgs, { cwd, windowsHide: true });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
      child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
      child.on('error', (err) => json(res, 200, { success: false, stdout, stderr: err.message, cwd }));
      child.on('close', (code) => json(res, 200, { success: code === 0, stdout, stderr, code, cwd }));
      return;
    } catch (err) {
      return json(res, 200, { success: false, stdout: '', stderr: err.message, cwd });
    }
  }

  if (req.method === 'POST' && p === '/api/terminal/cwd') {
    const body = await readBody(req);
    try {
      const cwd = await resolveCwd(body.cwd || os.homedir(), body.target || '');
      return json(res, 200, { success: true, cwd });
    } catch (err) {
      return json(res, 200, { success: false, cwd: safeCwd(body.cwd), error: err.message });
    }
  }

  // Streaming terminal execution (newline-delimited JSON events).
  if (req.method === 'POST' && p === '/api/terminal/stream') {
    const body = await readBody(req);
    const workCwd = safeCwd(body.cwd || os.homedir());
    const command = String(body.command || '').trim();
    const profile = body.profile || 'powershell';

    res.writeHead(200, {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-cache',
      'access-control-allow-origin': '*',
      'x-accel-buffering': 'no',
    });
    const send = (obj) => { try { res.write(JSON.stringify(obj) + '\n'); } catch { /* client gone */ } };
    const jobId = `job-${Date.now().toString(36)}`;
    send({ type: 'start', jobId });

    if (!command) { send({ type: 'end', code: 0, jobId }); return res.end(); }

    let shellName;
    let shellArgs;
    if (profile === 'bash') { shellName = process.platform === 'win32' ? 'bash.exe' : '/bin/bash'; shellArgs = ['-lc', command]; }
    else if (profile === 'cmd') { shellName = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'; shellArgs = process.platform === 'win32' ? ['/d', '/s', '/c', command] : ['-c', command]; }
    else if (profile === 'node') { shellName = 'node'; shellArgs = ['-e', command]; }
    else if (profile === 'python') { shellName = process.platform === 'win32' ? 'python.exe' : 'python3'; shellArgs = ['-c', command]; }
    else {
      shellName = process.platform === 'win32' ? 'powershell.exe' : '/bin/sh';
      shellArgs = process.platform === 'win32'
        ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command]
        : ['-lc', command];
    }

    try {
      const child = spawn(shellName, shellArgs, { cwd: workCwd, windowsHide: true });
      child.stdout.on('data', (chunk) => send({ type: 'data', chunk: chunk.toString('utf8') }));
      child.stderr.on('data', (chunk) => send({ type: 'err', chunk: chunk.toString('utf8') }));
      child.on('error', (err) => { send({ type: 'err', chunk: err.message }); send({ type: 'end', code: 1, jobId }); res.end(); });
      child.on('close', (code) => { send({ type: 'end', code: code ?? 0, jobId }); res.end(); });
      req.on('close', () => { try { child.kill(); } catch { /* noop */ } });
    } catch (err) {
      send({ type: 'err', chunk: err.message });
      send({ type: 'end', code: 1, jobId });
      res.end();
    }
    return;
  }

  // Path completion for the terminal autocomplete.
  if (req.method === 'POST' && p === '/api/fs/complete') {
    const body = await readBody(req);
    const baseCwd = safeCwd(body.cwd || os.homedir());
    const prefix = String(body.prefix || '');
    // Split prefix into dir + filename
    const dirPart = prefix.includes('/') || prefix.includes('\\')
      ? prefix.replace(/[\\/][^\\/]*$/, '') || (prefix.startsWith('/') ? '/' : '.')
      : '.';
    const filePart = prefix.split(/[\\/]/).pop() || '';
    const searchDir = path.isAbsolute(dirPart)
      ? expandHome(dirPart)
      : path.resolve(baseCwd, expandHome(dirPart));
    try {
      const entries = await fsp.readdir(searchDir, { withFileTypes: true });
      const matches = entries
        .filter((e) => e.name.toLowerCase().startsWith(filePart.toLowerCase()))
        .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
        .slice(0, 50)
        .map((e) => {
          const rel = dirPart === '.' ? e.name : `${dirPart.replace(/[\\/]$/, '')}/${e.name}`;
          return e.isDirectory() ? `${rel}/` : rel;
        });
      return json(res, 200, { success: true, items: matches });
    } catch (err) {
      return json(res, 200, { success: true, items: [] });
    }
  }

  // ── Sources CRUD (FTP + custom local roots persisted to ~/.cognitive-explorer) ──
  if (req.method === 'GET' && p === '/api/sources') {
    return json(res, 200, { success: true, sources: await getAllSources() });
  }
  if (req.method === 'POST' && p === '/api/sources') {
    const body = await readBody(req);
    const list = loadSources();
    const source = { id: `src-${Date.now()}`, status: 'configured', readOnly: false, ...body, mock: false };
    list.push(source);
    saveSources(list);
    return json(res, 200, { success: true, source });
  }
  const delMatch = /^\/api\/sources\/([^/]+)$/.exec(p);
  if (req.method === 'DELETE' && delMatch) {
    const next = loadSources().filter((s) => s.id !== delMatch[1]);
    saveSources(next);
    return json(res, 200, { success: true });
  }

  const sourceTestMatch = /^\/api\/sources\/([^/]+)\/test$/.exec(p);
  if (req.method === 'POST' && sourceTestMatch) {
    const source = (await getAllSources({ includeSecrets: true })).find((s) => s.id === sourceTestMatch[1]);
    if (!source) return json(res, 404, { success: false, error: 'Source not found' });
    try {
      if (source.type === 'ftp') await withFtpClient(source, async () => true);
      else if (source.type === 'webdav') await testWebDav(source);
      else if (source.type === 'local' || source.type === 'network') await fsp.access(expandHome(source.root || os.homedir()));
      else throw new Error('Test réel non disponible pour ce fournisseur');
      return json(res, 200, { success: true, sourceId: source.id });
    } catch (err) {
      return json(res, 200, { success: false, sourceId: source.id, error: err.message });
    }
  }

  const sourceRawMatch = /^\/api\/sources\/([^/]+)\/raw$/.exec(p);
  if (req.method === 'GET' && sourceRawMatch) {
    const source = (await getAllSources({ includeSecrets: true })).find((s) => s.id === sourceRawMatch[1]);
    if (!source) return json(res, 404, { success: false, error: 'Source not found' });
    if (source.type === 'ftp') return json(res, 400, { success: false, error: 'Raw preview for FTP is not implemented yet' });
    const targetPath = url.searchParams.get('path') || '/';
    try {
      const fullPath = resolveSourcePath(source, targetPath);
      const stat = await fsp.stat(fullPath);
      if (!stat.isFile()) return json(res, 400, { success: false, error: 'Not a file' });
      res.writeHead(200, {
        'content-type': mimeFromName(fullPath),
        'content-length': stat.size,
        'access-control-allow-origin': '*',
        'cache-control': 'private, max-age=60',
      });
      fs.createReadStream(fullPath).pipe(res);
      return;
    } catch (err) {
      return json(res, 404, { success: false, error: err.message });
    }
  }

  // ── FTP test + list ───────────────────────────────────────────────────────
  if (req.method === 'POST' && p === '/api/ftp/test') {
    const body = await readBody(req);
    try { await withFtpClient(body, async () => true); return json(res, 200, { success: true }); }
    catch (err) { return json(res, 200, { success: false, error: err.message }); }
  }

  if (req.method === 'POST' && p === '/api/webdav/test') {
    const body = await readBody(req);
    try { await testWebDav(body); return json(res, 200, { success: true }); }
    catch (err) { return json(res, 200, { success: false, error: err.message }); }
  }

  const ftpListMatch = /^\/api\/sources\/([^/]+)\/list$/.exec(p);
  if (req.method === 'GET' && ftpListMatch) {
    const source = (await getAllSources({ includeSecrets: true })).find((s) => s.id === ftpListMatch[1]);
    if (!source) return json(res, 404, { success: false, error: 'Source not found' });
    const targetPath = url.searchParams.get('path') || '/';
    try {
      let items;
      if (source.type === 'ftp') items = await listFtpDir(source, targetPath);
      else if (source.type === 'webdav') items = await listWebDavDir(source, targetPath);
      else if (source.type === 'local' || source.type === 'network') items = await listLocalDir(resolveSourcePath(source, targetPath));
      else throw new Error('Listing réel non disponible pour ce fournisseur');
      return json(res, 200, { success: true, sourceId: source.id, path: targetPath, items });
    } catch (err) {
      return json(res, 200, { success: false, sourceId: source.id, items: [], error: err.message });
    }
  }

  // ── GitHub proxy ──────────────────────────────────────────────────────────
  if (p.startsWith('/api/github/')) {
    const sub = p.replace('/api/github/', '/') + (url.search || '');
    const result = await githubProxy(sub, req);
    return json(res, result.status, result.body);
  }

  return json(res, 404, { success: false, error: 'Not found', path: p });
}

createServer((req, res) => {
  route(req, res).catch((err) => {
    console.error('[explorer-api]', err);
    json(res, 500, { success: false, error: err.message || 'Internal error' });
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`[explorer-api] listening on http://127.0.0.1:${port}`);
});
