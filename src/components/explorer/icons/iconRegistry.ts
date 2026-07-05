// HD vendor-grade icon registry.
// Strategy: vscode-icons (Material Icon Theme) by extension → Fluent Emoji 3D by file type → emoji fallback.
// All assets are hot-linked from public CDNs so they render in HD on every OS.

import { FileType } from '@/types/fileExplorer';

// === vscode-icons (per extension/filename) — gold standard for dev file icons ===
// CDN: https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/
const MAT = (name: string) =>
  `https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/${name}.svg`;

// === Microsoft Fluent UI Emoji 3D (HD, vendor-grade) for file types & locations ===
// Hosted via jsdelivr from microsoft/fluentui-emoji
const FLUENT_3D = (folder: string, file: string) =>
  `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/${folder}/3D/${file}`;

// === Per-extension HD icons (vscode material) ===
export const extensionIconMap: Record<string, string> = {
  // Microsoft Office
  doc: MAT('word'),
  docx: MAT('word'),
  rtf: MAT('word'),
  odt: MAT('word'),
  xls: MAT('excel'),
  xlsx: MAT('excel'),
  csv: MAT('table'),
  ods: MAT('excel'),
  ppt: MAT('powerpoint'),
  pptx: MAT('powerpoint'),
  odp: MAT('powerpoint'),
  // PDF
  pdf: MAT('pdf'),
  // Adobe
  psd: MAT('photoshop'),
  ai: MAT('illustrator'),
  // Design
  fig: MAT('figma'),
  sketch: MAT('sketch'),
  xd: MAT('xd'),
  // Archives
  zip: MAT('zip'),
  rar: MAT('zip'),
  '7z': MAT('zip'),
  tar: MAT('zip'),
  gz: MAT('zip'),
  'tar.gz': MAT('zip'),
  wim: MAT('disc'),
  iso: MAT('disc'),
  dmg: MAT('disc'),
  // Executables
  exe: MAT('exe'),
  msi: MAT('exe'),
  app: MAT('exe'),
  bat: MAT('console'),
  sh: MAT('console'),
  cmd: MAT('console'),
  // Audio (distinct per format)
  mp3: MAT('audio'),
  flac: MAT('audio'),
  wav: MAT('audio'),
  ogg: MAT('audio'),
  m4a: MAT('audio'),
  aac: MAT('audio'),
  m3u: MAT('playlist'),
  // Video
  mp4: MAT('video'),
  mov: MAT('video'),
  webm: MAT('video'),
  mkv: MAT('video'),
  avi: MAT('video'),
  aep: MAT('aftereffects'),
  prproj: MAT('premiere'),
  // Images
  jpg: MAT('image'),
  jpeg: MAT('image'),
  png: MAT('image'),
  gif: MAT('image'),
  webp: MAT('image'),
  bmp: MAT('image'),
  ico: MAT('image'),
  tiff: MAT('image'),
  svg: MAT('svg'),
  // Code
  ts: MAT('typescript'),
  tsx: MAT('react_ts'),
  js: MAT('javascript'),
  jsx: MAT('react'),
  mjs: MAT('javascript'),
  cjs: MAT('javascript'),
  py: MAT('python'),
  rb: MAT('ruby'),
  go: MAT('go'),
  rs: MAT('rust'),
  java: MAT('java'),
  kt: MAT('kotlin'),
  swift: MAT('swift'),
  c: MAT('c'),
  h: MAT('h'),
  cpp: MAT('cpp'),
  cs: MAT('csharp'),
  php: MAT('php'),
  html: MAT('html'),
  htm: MAT('html'),
  css: MAT('css'),
  scss: MAT('sass'),
  sass: MAT('sass'),
  less: MAT('less'),
  vue: MAT('vue'),
  svelte: MAT('svelte'),
  json: MAT('json'),
  yaml: MAT('yaml'),
  yml: MAT('yaml'),
  toml: MAT('settings'),
  xml: MAT('xml'),
  md: MAT('markdown'),
  mdx: MAT('mdx'),
  // Database
  sql: MAT('database'),
  db: MAT('database'),
  sqlite: MAT('database'),
  // Text
  txt: MAT('document'),
  log: MAT('log'),
  gitignore: MAT('git'),
  // Fonts
  ttf: MAT('font'),
  otf: MAT('font'),
  woff: MAT('font'),
  woff2: MAT('font'),
  // System
  sys: MAT('settings'),
  dll: MAT('settings'),
};

// === Per-filename overrides (exact match, lowercase) ===
export const filenameIconMap: Record<string, string> = {
  'package.json': MAT('nodejs'),
  'package-lock.json': MAT('nodejs'),
  'tsconfig.json': MAT('tsconfig'),
  'readme.md': MAT('readme'),
  '.gitignore': MAT('git'),
  '.env': MAT('tune'),
  'dockerfile': MAT('docker'),
  'docker-compose.yml': MAT('docker'),
};

// === Fluent 3D HD icons by FileType (fallback when no extension match) ===
export const typeIconMap: Record<FileType, string> = {
  folder: FLUENT_3D('Open%20file%20folder', 'open_file_folder_3d.png'),
  image: FLUENT_3D('Framed%20picture', 'framed_picture_3d.png'),
  document: MAT('word'),
  video: FLUENT_3D('Clapper%20board', 'clapper_board_3d.png'),
  audio: FLUENT_3D('Musical%20note', 'musical_note_3d.png'),
  code: MAT('html'),
  archive: MAT('zip'),
  executable: MAT('exe'),
  text: MAT('document'),
  pdf: MAT('pdf'),
  spreadsheet: MAT('excel'),
  presentation: MAT('powerpoint'),
  font: MAT('font'),
  database: MAT('database'),
  unknown: MAT('file'),
};

// === Special location icons (sidebar, drives, network) ===
export const locationIcons = {
  thisPC: FLUENT_3D('Desktop%20computer', 'desktop_computer_3d.png'),
  // Hard disks: real HDD/SSD via material icon-theme folder/disk style
  driveLocal: FLUENT_3D('Floppy%20disk', 'floppy_disk_3d.png'), // fallback only
  driveSSD: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-server.svg',
  driveSystem: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-windows.svg',
  driveData: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-database.svg',
  driveBackup: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-archive.svg',
  // USB stick — real key icon
  usb: 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-system-icons@main/assets/Usb%20Stick/SVG/ic_fluent_usb_stick_24_color.svg',
  usbFallback: FLUENT_3D('Electric%20plug', 'electric_plug_3d.png'),
  // Cloud providers — official logos
  googleDrive: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg',
  oneDrive: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg',
  dropbox: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg',
  cloud: FLUENT_3D('Cloud', 'cloud_3d.png'),
  // Servers
  nas: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-server.svg',
  ftp: 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-system-icons@main/assets/Server/SVG/ic_fluent_server_24_color.svg',
  network: FLUENT_3D('Globe%20with%20meridians', 'globe_with_meridians_3d.png'),
  // Mobile
  phone: FLUENT_3D('Mobile%20phone', 'mobile_phone_3d.png'),
  // Trash (empty / full variants)
  trashEmpty: FLUENT_3D('Wastebasket', 'wastebasket_3d.png'),
  trashFull: FLUENT_3D('Wastebasket', 'wastebasket_3d.png'),
  // Quick access folders
  desktop: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-desktop.svg',
  downloads: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-download.svg',
  documents: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-resource.svg',
  pictures: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-images.svg',
  music: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-audio.svg',
  videos: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-video.svg',
  // Generic folder
  // Classic YELLOW folder from vscode-icons (Material Icon Theme's default is blue).
  folder: 'https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@latest/icons/default_folder.svg',
  folderOpen: 'https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@latest/icons/default_folder_opened.svg',
  // Special folders by name (lower-case match)
  git: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-git.svg',
  nodeModules: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-node.svg',
  github: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/github.svg',
};

// === Per-folder name → custom folder icon ===
export const folderNameIconMap: Record<string, string> = {
  desktop: locationIcons.desktop,
  bureau: locationIcons.desktop,
  downloads: locationIcons.downloads,
  téléchargements: locationIcons.downloads,
  documents: locationIcons.documents,
  pictures: locationIcons.pictures,
  images: locationIcons.pictures,
  music: locationIcons.music,
  musique: locationIcons.music,
  videos: locationIcons.videos,
  vidéos: locationIcons.videos,
  '.git': locationIcons.git,
  node_modules: locationIcons.nodeModules,
  fonts: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-font.svg',
  windows: locationIcons.driveSystem,
  system32: locationIcons.driveSystem,
  'program files': 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-app.svg',
  'program files (x86)': 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-app.svg',
  users: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-client.svg',
  utilisateur: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-home.svg',
  projects: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-src.svg',
  games: 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/folder-controller.svg',
  backups: locationIcons.driveBackup,
  trash: locationIcons.trashEmpty,
  corbeille: locationIcons.trashEmpty,
};

// Fluent emoji 2D fallback icon URL (Twemoji)
export const twemoji = (codepoint: string) =>
  `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${codepoint}.png`;

// === Always-available inline-SVG fallbacks (no network) ===
import * as FB from './iconFallbacks';

export const locationFallbacks = {
  thisPC: FB.fbThisPC,
  driveSystem: FB.fbDriveSystem,
  driveData: FB.fbDrive,
  driveBackup: FB.fbFolderArchive,
  driveSSD: FB.fbDrive,
  driveLocal: FB.fbDrive,
  usb: FB.fbUSB,
  usbFallback: FB.fbUSB,
  googleDrive: FB.fbCloud,
  oneDrive: FB.fbCloud,
  dropbox: FB.fbCloud,
  cloud: FB.fbCloud,
  nas: FB.fbFolderServer,
  ftp: FB.fbFolderServer,
  network: FB.fbNetwork,
  phone: FB.fbPhone,
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
  git: FB.fbFolder,
  nodeModules: FB.fbFolder,
  github: FB.fbFolder,
} as const;

export function resolveIconFallback(args: { type: FileType; extension?: string; name?: string }): string {
  const { type, name } = args;
  if (type === 'folder') {
    const lower = (name || '').toLowerCase();
    if (lower === 'desktop' || lower === 'bureau') return FB.fbFolderDesktop;
    if (lower === 'downloads' || lower === 'téléchargements' || lower === 'telechargements') return FB.fbFolderDownload;
    if (lower === 'documents') return FB.fbFolderResource;
    if (lower === 'pictures' || lower === 'images') return FB.fbFolderImages;
    if (lower === 'music' || lower === 'musique') return FB.fbFolderAudio;
    if (lower === 'videos' || lower === 'vidéos') return FB.fbFolderVideo;
    if (lower === 'windows' || lower === 'system32') return FB.fbFolderWindows;
    return FB.fbFolder;
  }
  return FB.fbFile;
}

// Resolve final icon URL with cascade
export function resolveIconUrl(args: {
  type: FileType;
  extension?: string;
  name?: string;
}): string {
  const { type, extension, name } = args;

  // 1. Filename exact match (e.g. package.json)
  if (name) {
    const lower = name.toLowerCase();
    if (filenameIconMap[lower]) return filenameIconMap[lower];
    if (type === 'folder' && folderNameIconMap[lower]) return folderNameIconMap[lower];
  }

  // 2. Extension match
  if (extension) {
    const ext = extension.toLowerCase();
    if (extensionIconMap[ext]) return extensionIconMap[ext];
  }

  // 3. Default folder
  if (type === 'folder') return locationIcons.folder;

  // 4. Type fallback
  return typeIconMap[type] || typeIconMap.unknown;
}
