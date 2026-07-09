// Async icon resolver: every UI surface gets an instant, inline SVG ("web icon")
// at render time, and the resolver upgrades it in the background to a higher
// fidelity asset — first the native OS icon (Electron `getFileIcons`), then a
// CDN HD asset (vscode-material / fluent 3D). If both fail, the inline SVG
// stays. Nothing on this path blocks React's render.

import { FileType } from '@/types/fileExplorer';
import * as FB from '@/components/explorer/icons/iconFallbacks';
import { apiUrl } from '@/lib/apiClient';

// ----- Descriptors -----

export type LocationKey =
  | 'thisPC' | 'driveSystem' | 'driveData' | 'driveBackup' | 'driveSSD'
  | 'usb' | 'googleDrive' | 'oneDrive' | 'dropbox' | 'box' | 'icloud'
  | 'webdav' | 's3' | 'cloud'
  | 'nas' | 'ftp' | 'sftp' | 'ftps' | 'smb' | 'network' | 'phone' | 'host'
  | 'trashEmpty' | 'trashFull'
  | 'desktop' | 'downloads' | 'documents' | 'pictures' | 'music' | 'videos'
  | 'folder' | 'folderOpen';

export type IconDescriptor =
  | { kind: 'file'; type: FileType; name?: string; extension?: string; path?: string }
  | { kind: 'location'; key: LocationKey; path?: string };

// ----- Inline SVG (always available, synchronous) -----

const FILE_TYPE_BASE: Record<FileType, string> = {
  folder: FB.fbFolder,
  image: FB.fbFolderImages,
  document: FB.fbFile,
  video: FB.fbFolderVideo,
  audio: FB.fbFolderAudio,
  code: FB.fbFile,
  archive: FB.fbFolderArchive,
  executable: FB.fbFile,
  text: FB.fbFile,
  pdf: FB.fbFile,
  spreadsheet: FB.fbFile,
  presentation: FB.fbFile,
  font: FB.fbFile,
  database: FB.fbFolderDatabase,
  unknown: FB.fbFile,
};

const LOCATION_BASE: Record<LocationKey, string> = {
  thisPC: FB.fbThisPC,
  driveSystem: FB.fbDriveSystem,
  driveData: FB.fbDrive,
  driveBackup: FB.fbFolderArchive,
  driveSSD: FB.fbDrive,
  usb: FB.fbUSB,
  googleDrive: FB.fbCloud,
  oneDrive: FB.fbCloud,
  dropbox: FB.fbCloud,
  box: FB.fbCloud,
  icloud: FB.fbCloud,
  webdav: FB.fbFolderServer,
  s3: FB.fbFolderServer,
  cloud: FB.fbCloud,
  nas: FB.fbFolderServer,
  ftp: FB.fbFolderServer,
  sftp: FB.fbFolderServer,
  ftps: FB.fbFolderServer,
  smb: FB.fbFolderServer,
  network: FB.fbNetwork,
  phone: FB.fbPhone,
  host: FB.fbFolderServer,
  trashEmpty: FB.fbTrash,
  trashFull: FB.fbTrash,
  desktop: FB.fbFolderDesktop,
  downloads: FB.fbFolderDownload,
  documents: FB.fbFolderResource,
  pictures: FB.fbFolderImages,
  music: FB.fbFolderAudio,
  videos: FB.fbFolderVideo,
  folder: FB.fbFolder,
  folderOpen: FB.fbFolderOpen,
};

const FOLDER_NAME_BASE: Record<string, string> = {
  desktop: FB.fbFolderDesktop, bureau: FB.fbFolderDesktop,
  downloads: FB.fbFolderDownload, téléchargements: FB.fbFolderDownload, telechargements: FB.fbFolderDownload,
  documents: FB.fbFolderResource,
  pictures: FB.fbFolderImages, images: FB.fbFolderImages,
  music: FB.fbFolderAudio, musique: FB.fbFolderAudio,
  videos: FB.fbFolderVideo, vidéos: FB.fbFolderVideo,
  windows: FB.fbFolderWindows, system32: FB.fbFolderWindows,
};

export function getBaseIcon(d: IconDescriptor): string {
  if (d.kind === 'location') return LOCATION_BASE[d.key] || FB.fbFolder;
  if (d.type === 'folder') {
    const lower = (d.name || '').toLowerCase();
    return FOLDER_NAME_BASE[lower] || FB.fbFolder;
  }
  return FILE_TYPE_BASE[d.type] || FB.fbFile;
}

// ----- Upgrade table: descriptor → CDN HD URL -----

const MAT = (n: string) => `https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/${n}.svg`;

const EXT_UPGRADE: Record<string, string> = {
  doc: MAT('word'), docx: MAT('word'), rtf: MAT('word'), odt: MAT('word'),
  xls: MAT('excel'), xlsx: MAT('excel'), csv: MAT('table'), ods: MAT('excel'),
  ppt: MAT('powerpoint'), pptx: MAT('powerpoint'), odp: MAT('powerpoint'),
  pdf: MAT('pdf'),
  psd: MAT('photoshop'), ai: MAT('illustrator'), fig: MAT('figma'), sketch: MAT('sketch'), xd: MAT('xd'),
  zip: MAT('zip'), rar: MAT('zip'), '7z': MAT('zip'), tar: MAT('zip'), gz: MAT('zip'),
  iso: MAT('disc'), dmg: MAT('disc'), wim: MAT('disc'),
  exe: MAT('exe'), msi: MAT('exe'), app: MAT('exe'),
  bat: MAT('console'), sh: MAT('console'), cmd: MAT('console'), ps1: MAT('powershell'),
  mp3: MAT('audio'), flac: MAT('audio'), wav: MAT('audio'), ogg: MAT('audio'), m4a: MAT('audio'), aac: MAT('audio'),
  mp4: MAT('video'), mov: MAT('video'), webm: MAT('video'), mkv: MAT('video'), avi: MAT('video'),
  jpg: MAT('image'), jpeg: MAT('image'), png: MAT('image'), gif: MAT('image'), webp: MAT('image'), bmp: MAT('image'), ico: MAT('image'), tiff: MAT('image'),
  svg: MAT('svg'),
  ts: MAT('typescript'), tsx: MAT('react_ts'), js: MAT('javascript'), jsx: MAT('react'), mjs: MAT('javascript'), cjs: MAT('javascript'),
  py: MAT('python'), rb: MAT('ruby'), go: MAT('go'), rs: MAT('rust'), java: MAT('java'), kt: MAT('kotlin'), swift: MAT('swift'),
  c: MAT('c'), h: MAT('h'), cpp: MAT('cpp'), cs: MAT('csharp'), php: MAT('php'),
  html: MAT('html'), htm: MAT('html'), css: MAT('css'), scss: MAT('sass'), sass: MAT('sass'), less: MAT('less'),
  vue: MAT('vue'), svelte: MAT('svelte'),
  json: MAT('json'), yaml: MAT('yaml'), yml: MAT('yaml'), toml: MAT('settings'), xml: MAT('xml'),
  md: MAT('markdown'), mdx: MAT('mdx'),
  sql: MAT('database'), db: MAT('database'), sqlite: MAT('database'),
  txt: MAT('document'), log: MAT('log'),
  ttf: MAT('font'), otf: MAT('font'), woff: MAT('font'), woff2: MAT('font'),
};

const FOLDER_NAME_UPGRADE: Record<string, string> = {
  desktop: MAT('folder-desktop'), bureau: MAT('folder-desktop'),
  downloads: MAT('folder-download'), téléchargements: MAT('folder-download'), telechargements: MAT('folder-download'),
  documents: MAT('folder-resource'),
  pictures: MAT('folder-images'), images: MAT('folder-images'),
  music: MAT('folder-audio'), musique: MAT('folder-audio'),
  videos: MAT('folder-video'), vidéos: MAT('folder-video'),
  windows: MAT('folder-windows'), system32: MAT('folder-windows'),
  '.git': MAT('folder-git'),
  node_modules: MAT('folder-node'),
  fonts: MAT('folder-font'),
  'program files': MAT('folder-app'),
  'program files (x86)': MAT('folder-app'),
  users: MAT('folder-client'),
  games: MAT('folder-controller'),
  src: MAT('folder-src'),
  projects: MAT('folder-src'),
};

const LOCATION_UPGRADE: Record<LocationKey, string | null> = {
  thisPC: null, // inline SVG is already nice; skip CDN
  driveSystem: MAT('folder-windows'),
  driveData: MAT('folder-database'),
  driveBackup: MAT('folder-archive'),
  driveSSD: MAT('folder-server'),
  usb: null,
  googleDrive: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg',
  oneDrive: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg',
  dropbox: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg',
  box: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/box.svg',
  icloud: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/ICloud_logo.svg',
  webdav: MAT('folder-server'),
  s3: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/amazons3.svg',
  cloud: null,
  nas: MAT('folder-server'),
  ftp: MAT('folder-server'),
  sftp: MAT('folder-server'),
  ftps: MAT('folder-server'),
  smb: MAT('folder-server'),
  network: null,
  phone: null,
  host: MAT('folder-server'),
  trashEmpty: null,
  trashFull: null,
  desktop: MAT('folder-desktop'),
  downloads: MAT('folder-download'),
  documents: MAT('folder-resource'),
  pictures: MAT('folder-images'),
  music: MAT('folder-audio'),
  videos: MAT('folder-video'),
  // Generic folders: keep the yellow inline SVG (no CDN upgrade) so folders
  // stay yellow instead of Material Icon Theme's blue default.
  folder: null,
  folderOpen: null,
};

function getUpgradeUrl(d: IconDescriptor): string | null {
  if (d.kind === 'location') return LOCATION_UPGRADE[d.key] ?? null;
  if (d.type === 'folder') {
    const lower = (d.name || '').toLowerCase();
    if (FOLDER_NAME_UPGRADE[lower]) return FOLDER_NAME_UPGRADE[lower];
    // No CDN upgrade for plain folders — keep them yellow via the inline SVG.
    return null;
  }
  if (d.extension) {
    const ext = d.extension.toLowerCase();
    if (EXT_UPGRADE[ext]) return EXT_UPGRADE[ext];
  }
  return MAT('file');
}

// ----- Stable cache key per descriptor -----

export function descriptorKey(d: IconDescriptor): string {
  if (d.kind === 'location') return `loc:${d.key}`;
  // path is intentionally not part of the key — we want descriptors with same
  // type/ext/name to share the resolved upgrade. Native icon upgrades use path
  // separately and are cached per-path inside the upgrader.
  return `f:${d.type}:${(d.extension || '').toLowerCase()}:${(d.name || '').toLowerCase()}`;
}

// ----- Resolved cache + subscriptions -----

const SESSION_KEY = 'icon-resolver.v1';
const resolved = new Map<string, string>();
const failed = new Set<string>();
const subs = new Map<string, Set<() => void>>();

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, string>;
    for (const k in obj) resolved.set(k, obj[k]);
  } catch { /* noop */ }
}
function saveSessionDebounced() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const obj: Record<string, string> = {};
      resolved.forEach((v, k) => { obj[k] = v; });
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(obj));
    } catch { /* noop */ }
  }, 500) as unknown as number;
}
let saveTimer: number | null = null;

if (typeof window !== 'undefined') loadSession();

export function getResolvedIcon(key: string): string | null {
  return resolved.get(key) || null;
}

export function subscribe(key: string, fn: () => void): () => void {
  let set = subs.get(key);
  if (!set) { set = new Set(); subs.set(key, set); }
  set.add(fn);
  return () => { set!.delete(fn); if (!set!.size) subs.delete(key); };
}
function notify(key: string) {
  subs.get(key)?.forEach(fn => fn());
}

function setResolved(key: string, url: string) {
  if (resolved.get(key) === url) return;
  resolved.set(key, url);
  saveSessionDebounced();
  notify(key);
}

// ----- Concurrency-limited background queue -----

const MAX_CONCURRENT = 4;
const queue: Array<() => Promise<void>> = [];
const enqueued = new Set<string>();
let active = 0;

function scheduleIdle(fn: () => void) {
  if (typeof window === 'undefined') return;
  type RequestIdle = (cb: () => void, opts?: { timeout?: number }) => number;
  const ric = (window as Window & typeof globalThis & { requestIdleCallback?: RequestIdle }).requestIdleCallback;
  if (ric) ric(fn, { timeout: 500 });
  else setTimeout(fn, 0);
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    const task = queue.shift()!;
    active++;
    task().finally(() => { active--; if (queue.length) scheduleIdle(pump); });
  }
}

function tryLoadImage(url: string): Promise<boolean> {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(true);
    img.onerror = () => res(false);
    img.src = url;
  });
}

export function requestUpgrade(d: IconDescriptor): void {
  if (typeof window === 'undefined') return;
  const key = descriptorKey(d);
  if (resolved.has(key) || failed.has(key) || enqueued.has(key)) return;
  enqueued.add(key);

  const task = async () => {
    try {
      if (d.kind === 'file' && d.path && /^[a-z]:\\/i.test(d.path)) {
        try {
          const response = await fetch(apiUrl(`/api/system/icon?path=${encodeURIComponent(d.path)}`));
          const payload = await response.json();
          if (payload?.success && payload.icon) {
            setResolved(key, payload.icon);
            return;
          }
        } catch {
          // Fall through to bundled/CDN icon fallback.
        }
      }
      const cdn = getUpgradeUrl(d);
      if (cdn) {
        const ok = await tryLoadImage(cdn);
        if (ok) { setResolved(key, cdn); return; }
      }
      failed.add(key);
    } finally {
      enqueued.delete(key);
    }
  };
  queue.push(task);
  scheduleIdle(pump);
}

