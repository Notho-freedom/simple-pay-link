import { FileItem, DriveInfo, NetworkLocation } from '@/types/fileExplorer';

const d = (y: number, m: number, day: number, h = 10, min = 0) => new Date(y, m - 1, day, h, min);

export const drives: DriveInfo[] = [
  { id: 'drive-c', name: 'Windows (C:)', label: 'Système', letter: 'C', totalSpace: 476, usedSpace: 312, type: 'local', fileSystem: 'NTFS', rootId: 'drive-c-root' },
  { id: 'drive-d', name: 'Data (D:)', label: 'Données', letter: 'D', totalSpace: 931, usedSpace: 645, type: 'local', fileSystem: 'NTFS', rootId: 'drive-d-root' },
  { id: 'drive-e', name: 'Backup (E:)', label: 'Sauvegarde', letter: 'E', totalSpace: 1863, usedSpace: 1204, type: 'removable', fileSystem: 'NTFS', rootId: 'drive-e-root' },
  { id: 'drive-f', name: 'USB Drive (F:)', label: 'USB', letter: 'F', totalSpace: 32, usedSpace: 18, type: 'removable', fileSystem: 'FAT32', rootId: 'drive-f-root' },
];

export const networkLocations: NetworkLocation[] = [
  { id: 'net-gdrive', name: 'Google Drive', path: '\\\\cloud\\gdrive', type: 'cloud', status: 'connected', rootId: 'net-gdrive-root' },
  { id: 'net-onedrive', name: 'OneDrive', path: '\\\\cloud\\onedrive', type: 'cloud', status: 'syncing', rootId: 'net-onedrive-root' },
  { id: 'net-nas', name: 'NAS-Home', path: '\\\\192.168.1.100\\share', type: 'smb', status: 'connected', rootId: 'net-nas-root' },
  { id: 'net-ftp', name: 'FTP Server', path: 'ftp://files.company.com', type: 'ftp', status: 'disconnected', rootId: 'net-ftp-root' },
];

export const quickAccessIds = ['desktop', 'downloads', 'documents', 'pictures', 'music', 'videos'];

export const fileSystem: Record<string, FileItem> = {
  // ROOT — Ce PC
  'root': { id: 'root', name: 'Ce PC', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: null, children: ['drive-c-root', 'drive-d-root', 'drive-e-root', 'drive-f-root'] },

  // NETWORK root
  'network-root': { id: 'network-root', name: 'Réseau', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: null, children: ['net-gdrive-root', 'net-onedrive-root', 'net-nas-root', 'net-ftp-root'] },

  // ── Quick Access folders ──
  'desktop': { id: 'desktop', name: 'Bureau', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'c-users-me', children: ['desktop-f1', 'desktop-f2', 'desktop-f3', 'desktop-f4', 'desktop-f5', 'desktop-f6', 'desktop-f7'] },
  'desktop-f1': { id: 'desktop-f1', name: 'projet-final.pptx', type: 'presentation', extension: 'pptx', size: 15728640, dateModified: d(2026, 4, 8, 14, 30), dateCreated: d(2026, 3, 15), parentId: 'desktop' },
  'desktop-f2': { id: 'desktop-f2', name: 'notes-reunion.txt', type: 'text', extension: 'txt', size: 4096, dateModified: d(2026, 4, 9, 16, 45), dateCreated: d(2026, 4, 9), parentId: 'desktop' },
  'desktop-f3': { id: 'desktop-f3', name: 'budget-2026.xlsx', type: 'spreadsheet', extension: 'xlsx', size: 524288, dateModified: d(2026, 4, 7, 11, 20), dateCreated: d(2026, 1, 5), parentId: 'desktop' },
  'desktop-f4': { id: 'desktop-f4', name: 'screenshot-app.png', type: 'image', extension: 'png', size: 2097152, dateModified: d(2026, 4, 10, 9, 15), dateCreated: d(2026, 4, 10), parentId: 'desktop' },
  'desktop-f5': { id: 'desktop-f5', name: 'Nouveau dossier', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2026, 4, 10), parentId: 'desktop', children: [] },
  'desktop-f6': { id: 'desktop-f6', name: 'rapport-client.docx', type: 'document', extension: 'docx', size: 358400, dateModified: d(2026, 4, 6), dateCreated: d(2026, 3, 20), parentId: 'desktop' },
  'desktop-f7': { id: 'desktop-f7', name: 'todo-semaine.md', type: 'code', extension: 'md', size: 1536, dateModified: d(2026, 4, 10, 8, 0), dateCreated: d(2026, 4, 7), parentId: 'desktop' },

  'downloads': { id: 'downloads', name: 'Téléchargements', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'c-users-me', children: ['dl-1', 'dl-2', 'dl-3', 'dl-4', 'dl-5', 'dl-6', 'dl-7', 'dl-8', 'dl-9', 'dl-10'] },
  'dl-1': { id: 'dl-1', name: 'node-v20.12.0-x64.msi', type: 'executable', extension: 'msi', size: 31457280, dateModified: d(2026, 4, 9), dateCreated: d(2026, 4, 9), parentId: 'downloads' },
  'dl-2': { id: 'dl-2', name: 'rapport-annuel.pdf', type: 'pdf', extension: 'pdf', size: 8388608, dateModified: d(2026, 4, 8), dateCreated: d(2026, 4, 8), parentId: 'downloads' },
  'dl-3': { id: 'dl-3', name: 'archive-photos.zip', type: 'archive', extension: 'zip', size: 157286400, dateModified: d(2026, 4, 7), dateCreated: d(2026, 4, 7), parentId: 'downloads' },
  'dl-4': { id: 'dl-4', name: 'VSCode-win32-x64.exe', type: 'executable', extension: 'exe', size: 94371840, dateModified: d(2026, 4, 5), dateCreated: d(2026, 4, 5), parentId: 'downloads' },
  'dl-5': { id: 'dl-5', name: 'design-mockup.fig', type: 'unknown', extension: 'fig', size: 12582912, dateModified: d(2026, 4, 4), dateCreated: d(2026, 4, 4), parentId: 'downloads' },
  'dl-6': { id: 'dl-6', name: 'podcast-ep42.mp3', type: 'audio', extension: 'mp3', size: 52428800, dateModified: d(2026, 4, 3), dateCreated: d(2026, 4, 3), parentId: 'downloads' },
  'dl-7': { id: 'dl-7', name: 'tutorial-react.mp4', type: 'video', extension: 'mp4', size: 524288000, dateModified: d(2026, 4, 2), dateCreated: d(2026, 4, 2), parentId: 'downloads' },
  'dl-8': { id: 'dl-8', name: 'facture-mars.pdf', type: 'pdf', extension: 'pdf', size: 1048576, dateModified: d(2026, 4, 1), dateCreated: d(2026, 4, 1), parentId: 'downloads' },
  'dl-9': { id: 'dl-9', name: 'Roboto-Regular.ttf', type: 'font', extension: 'ttf', size: 172032, dateModified: d(2026, 3, 28), dateCreated: d(2026, 3, 28), parentId: 'downloads' },
  'dl-10': { id: 'dl-10', name: 'docker-desktop.exe', type: 'executable', extension: 'exe', size: 629145600, dateModified: d(2026, 3, 25), dateCreated: d(2026, 3, 25), parentId: 'downloads' },

  'documents': { id: 'documents', name: 'Documents', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'c-users-me', children: ['doc-work', 'doc-personal', 'doc-1', 'doc-2', 'doc-3'] },
  'doc-work': { id: 'doc-work', name: 'Travail', type: 'folder', dateModified: d(2026, 4, 9), dateCreated: d(2025, 6, 1), parentId: 'documents', children: ['doc-w1', 'doc-w2', 'doc-w3', 'doc-w4', 'doc-w5'] },
  'doc-w1': { id: 'doc-w1', name: 'contrat-client-xyz.docx', type: 'document', extension: 'docx', size: 245760, dateModified: d(2026, 3, 20), dateCreated: d(2026, 3, 15), parentId: 'doc-work' },
  'doc-w2': { id: 'doc-w2', name: 'specs-techniques.md', type: 'code', extension: 'md', size: 32768, dateModified: d(2026, 4, 5), dateCreated: d(2026, 2, 10), parentId: 'doc-work' },
  'doc-w3': { id: 'doc-w3', name: 'planning-q2.xlsx', type: 'spreadsheet', extension: 'xlsx', size: 409600, dateModified: d(2026, 4, 1), dateCreated: d(2026, 3, 28), parentId: 'doc-work' },
  'doc-w4': { id: 'doc-w4', name: 'wireframes.pdf', type: 'pdf', extension: 'pdf', size: 5242880, dateModified: d(2026, 3, 10), dateCreated: d(2026, 3, 5), parentId: 'doc-work' },
  'doc-w5': { id: 'doc-w5', name: 'reunions-notes', type: 'folder', dateModified: d(2026, 4, 9), dateCreated: d(2026, 1, 1), parentId: 'doc-work', children: ['doc-w5-1', 'doc-w5-2'] },
  'doc-w5-1': { id: 'doc-w5-1', name: 'standup-04-09.md', type: 'code', extension: 'md', size: 2048, dateModified: d(2026, 4, 9), dateCreated: d(2026, 4, 9), parentId: 'doc-w5' },
  'doc-w5-2': { id: 'doc-w5-2', name: 'sprint-review-mars.docx', type: 'document', extension: 'docx', size: 184320, dateModified: d(2026, 3, 29), dateCreated: d(2026, 3, 29), parentId: 'doc-w5' },
  'doc-personal': { id: 'doc-personal', name: 'Personnel', type: 'folder', dateModified: d(2026, 4, 8), dateCreated: d(2025, 1, 1), parentId: 'documents', children: ['doc-p1', 'doc-p2', 'doc-p3'] },
  'doc-p1': { id: 'doc-p1', name: 'cv-2026.pdf', type: 'pdf', extension: 'pdf', size: 2097152, dateModified: d(2026, 2, 15), dateCreated: d(2026, 1, 10), parentId: 'doc-personal' },
  'doc-p2': { id: 'doc-p2', name: 'recettes-favorites.docx', type: 'document', extension: 'docx', size: 163840, dateModified: d(2026, 3, 22), dateCreated: d(2025, 8, 1), parentId: 'doc-personal' },
  'doc-p3': { id: 'doc-p3', name: 'impots-2025.pdf', type: 'pdf', extension: 'pdf', size: 3145728, dateModified: d(2026, 4, 2), dateCreated: d(2026, 4, 2), parentId: 'doc-personal' },
  'doc-1': { id: 'doc-1', name: 'README.md', type: 'code', extension: 'md', size: 8192, dateModified: d(2026, 4, 10), dateCreated: d(2025, 6, 1), parentId: 'documents' },
  'doc-2': { id: 'doc-2', name: 'todo-list.txt', type: 'text', extension: 'txt', size: 2048, dateModified: d(2026, 4, 9), dateCreated: d(2026, 4, 1), parentId: 'documents' },
  'doc-3': { id: 'doc-3', name: 'database-backup.sql', type: 'database', extension: 'sql', size: 67108864, dateModified: d(2026, 4, 8), dateCreated: d(2026, 4, 8), parentId: 'documents' },

  'pictures': { id: 'pictures', name: 'Images', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'c-users-me', children: ['pic-vacances', 'pic-screenshots', 'pic-wallpapers', 'pic-1', 'pic-2', 'pic-3'] },
  'pic-vacances': { id: 'pic-vacances', name: 'Vacances 2025', type: 'folder', dateModified: d(2025, 8, 20), dateCreated: d(2025, 7, 15), parentId: 'pictures', children: ['pic-v1', 'pic-v2', 'pic-v3', 'pic-v4'] },
  'pic-v1': { id: 'pic-v1', name: 'plage-sunset.jpg', type: 'image', extension: 'jpg', size: 4194304, dateModified: d(2025, 7, 18), dateCreated: d(2025, 7, 18), parentId: 'pic-vacances', thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=150&fit=crop' },
  'pic-v2': { id: 'pic-v2', name: 'montagne-panorama.jpg', type: 'image', extension: 'jpg', size: 8388608, dateModified: d(2025, 7, 20), dateCreated: d(2025, 7, 20), parentId: 'pic-vacances', thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&h=150&fit=crop' },
  'pic-v3': { id: 'pic-v3', name: 'restaurant-familial.png', type: 'image', extension: 'png', size: 3145728, dateModified: d(2025, 7, 19), dateCreated: d(2025, 7, 19), parentId: 'pic-vacances', thumbnail: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=150&fit=crop' },
  'pic-v4': { id: 'pic-v4', name: 'hotel-piscine.jpg', type: 'image', extension: 'jpg', size: 5242880, dateModified: d(2025, 7, 21), dateCreated: d(2025, 7, 21), parentId: 'pic-vacances', thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=150&fit=crop' },
  'pic-screenshots': { id: 'pic-screenshots', name: "Captures d'écran", type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2025, 1, 1), parentId: 'pictures', children: ['pic-s1', 'pic-s2', 'pic-s3'] },
  'pic-s1': { id: 'pic-s1', name: 'Screenshot_2026-04-10.png', type: 'image', extension: 'png', size: 1048576, dateModified: d(2026, 4, 10), dateCreated: d(2026, 4, 10), parentId: 'pic-screenshots' },
  'pic-s2': { id: 'pic-s2', name: 'Screenshot_2026-04-09.png', type: 'image', extension: 'png', size: 2097152, dateModified: d(2026, 4, 9), dateCreated: d(2026, 4, 9), parentId: 'pic-screenshots' },
  'pic-s3': { id: 'pic-s3', name: 'Screenshot_2026-04-07.png', type: 'image', extension: 'png', size: 1572864, dateModified: d(2026, 4, 7), dateCreated: d(2026, 4, 7), parentId: 'pic-screenshots' },
  'pic-wallpapers': { id: 'pic-wallpapers', name: 'Fonds d\'écran', type: 'folder', dateModified: d(2026, 3, 1), dateCreated: d(2025, 6, 1), parentId: 'pictures', children: ['pic-wp1', 'pic-wp2'] },
  'pic-wp1': { id: 'pic-wp1', name: 'nature-4k.jpg', type: 'image', extension: 'jpg', size: 15728640, dateModified: d(2026, 2, 14), dateCreated: d(2026, 2, 14), parentId: 'pic-wallpapers', thumbnail: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&h=150&fit=crop' },
  'pic-wp2': { id: 'pic-wp2', name: 'abstract-dark.png', type: 'image', extension: 'png', size: 8388608, dateModified: d(2026, 1, 20), dateCreated: d(2026, 1, 20), parentId: 'pic-wallpapers', thumbnail: 'https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?w=200&h=150&fit=crop' },
  'pic-1': { id: 'pic-1', name: 'avatar-profile.png', type: 'image', extension: 'png', size: 524288, dateModified: d(2026, 3, 1), dateCreated: d(2026, 3, 1), parentId: 'pictures', thumbnail: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=150&fit=crop' },
  'pic-2': { id: 'pic-2', name: 'wallpaper-4k.jpg', type: 'image', extension: 'jpg', size: 12582912, dateModified: d(2026, 2, 14), dateCreated: d(2026, 2, 14), parentId: 'pictures', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&h=150&fit=crop' },
  'pic-3': { id: 'pic-3', name: 'logo-company.svg', type: 'image', extension: 'svg', size: 16384, dateModified: d(2026, 1, 20), dateCreated: d(2025, 11, 5), parentId: 'pictures' },

  'music': { id: 'music', name: 'Musique', type: 'folder', dateModified: d(2026, 4, 5), dateCreated: d(2024, 1, 1), parentId: 'c-users-me', children: ['mus-1', 'mus-2', 'mus-3', 'mus-playlist'] },
  'mus-1': { id: 'mus-1', name: 'ambient-coding.mp3', type: 'audio', extension: 'mp3', size: 8388608, dateModified: d(2026, 3, 10), dateCreated: d(2026, 3, 10), parentId: 'music' },
  'mus-2': { id: 'mus-2', name: 'lofi-beats.flac', type: 'audio', extension: 'flac', size: 41943040, dateModified: d(2026, 2, 28), dateCreated: d(2026, 2, 28), parentId: 'music' },
  'mus-3': { id: 'mus-3', name: 'synthwave-mix.wav', type: 'audio', extension: 'wav', size: 104857600, dateModified: d(2026, 1, 15), dateCreated: d(2026, 1, 15), parentId: 'music' },
  'mus-playlist': { id: 'mus-playlist', name: 'Playlists', type: 'folder', dateModified: d(2026, 4, 1), dateCreated: d(2025, 6, 1), parentId: 'music', children: ['mus-p1', 'mus-p2'] },
  'mus-p1': { id: 'mus-p1', name: 'focus-time.m3u', type: 'audio', extension: 'm3u', size: 1024, dateModified: d(2026, 4, 1), dateCreated: d(2025, 9, 1), parentId: 'mus-playlist' },
  'mus-p2': { id: 'mus-p2', name: 'workout-mix.m3u', type: 'audio', extension: 'm3u', size: 2048, dateModified: d(2026, 3, 15), dateCreated: d(2025, 8, 1), parentId: 'mus-playlist' },

  'videos': { id: 'videos', name: 'Vidéos', type: 'folder', dateModified: d(2026, 4, 6), dateCreated: d(2024, 1, 1), parentId: 'c-users-me', children: ['vid-1', 'vid-2', 'vid-3', 'vid-proj'] },
  'vid-1': { id: 'vid-1', name: 'conference-keynote.mp4', type: 'video', extension: 'mp4', size: 1073741824, dateModified: d(2026, 4, 6), dateCreated: d(2026, 4, 6), parentId: 'videos' },
  'vid-2': { id: 'vid-2', name: 'screen-recording-demo.webm', type: 'video', extension: 'webm', size: 209715200, dateModified: d(2026, 3, 25), dateCreated: d(2026, 3, 25), parentId: 'videos' },
  'vid-3': { id: 'vid-3', name: 'timelapse-city.mov', type: 'video', extension: 'mov', size: 524288000, dateModified: d(2026, 2, 10), dateCreated: d(2026, 2, 10), parentId: 'videos' },
  'vid-proj': { id: 'vid-proj', name: 'Projets Montage', type: 'folder', dateModified: d(2026, 4, 3), dateCreated: d(2025, 10, 1), parentId: 'videos', children: ['vid-p1', 'vid-p2'] },
  'vid-p1': { id: 'vid-p1', name: 'intro-youtube.aep', type: 'video', extension: 'aep', size: 268435456, dateModified: d(2026, 4, 3), dateCreated: d(2026, 3, 1), parentId: 'vid-proj' },
  'vid-p2': { id: 'vid-p2', name: 'montage-vacances.prproj', type: 'video', extension: 'prproj', size: 157286400, dateModified: d(2026, 2, 15), dateCreated: d(2025, 12, 1), parentId: 'vid-proj' },

  // ── Drive C ──
  'drive-c-root': { id: 'drive-c-root', name: 'Windows (C:)', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'root', children: ['c-windows', 'c-program', 'c-program-x86', 'c-users', 'c-pagefile', 'c-hiberfil'] },
  'c-windows': { id: 'c-windows', name: 'Windows', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'drive-c-root', children: ['c-win-system32', 'c-win-fonts', 'c-win-temp'] },
  'c-win-system32': { id: 'c-win-system32', name: 'System32', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'c-windows', children: ['c-win-s32-1', 'c-win-s32-2'] },
  'c-win-s32-1': { id: 'c-win-s32-1', name: 'cmd.exe', type: 'executable', extension: 'exe', size: 323584, dateModified: d(2026, 1, 15), dateCreated: d(2024, 1, 1), parentId: 'c-win-system32' },
  'c-win-s32-2': { id: 'c-win-s32-2', name: 'notepad.exe', type: 'executable', extension: 'exe', size: 201728, dateModified: d(2026, 1, 15), dateCreated: d(2024, 1, 1), parentId: 'c-win-system32' },
  'c-win-fonts': { id: 'c-win-fonts', name: 'Fonts', type: 'folder', dateModified: d(2026, 3, 1), dateCreated: d(2024, 1, 1), parentId: 'c-windows', children: ['c-font-1', 'c-font-2', 'c-font-3'] },
  'c-font-1': { id: 'c-font-1', name: 'arial.ttf', type: 'font', extension: 'ttf', size: 389120, dateModified: d(2024, 1, 1), dateCreated: d(2024, 1, 1), parentId: 'c-win-fonts' },
  'c-font-2': { id: 'c-font-2', name: 'segoeui.ttf', type: 'font', extension: 'ttf', size: 532480, dateModified: d(2024, 1, 1), dateCreated: d(2024, 1, 1), parentId: 'c-win-fonts' },
  'c-font-3': { id: 'c-font-3', name: 'consola.ttf', type: 'font', extension: 'ttf', size: 245760, dateModified: d(2024, 1, 1), dateCreated: d(2024, 1, 1), parentId: 'c-win-fonts' },
  'c-win-temp': { id: 'c-win-temp', name: 'Temp', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'c-windows', children: [] },
  'c-program': { id: 'c-program', name: 'Program Files', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'drive-c-root', children: ['c-pf-vscode', 'c-pf-git', 'c-pf-nodejs'] },
  'c-pf-vscode': { id: 'c-pf-vscode', name: 'Microsoft VS Code', type: 'folder', dateModified: d(2026, 4, 5), dateCreated: d(2025, 3, 1), parentId: 'c-program', children: ['c-pf-vscode-1'] },
  'c-pf-vscode-1': { id: 'c-pf-vscode-1', name: 'Code.exe', type: 'executable', extension: 'exe', size: 148897792, dateModified: d(2026, 4, 5), dateCreated: d(2025, 3, 1), parentId: 'c-pf-vscode' },
  'c-pf-git': { id: 'c-pf-git', name: 'Git', type: 'folder', dateModified: d(2026, 3, 20), dateCreated: d(2025, 1, 1), parentId: 'c-program', children: [] },
  'c-pf-nodejs': { id: 'c-pf-nodejs', name: 'nodejs', type: 'folder', dateModified: d(2026, 4, 9), dateCreated: d(2025, 6, 1), parentId: 'c-program', children: ['c-pf-node-1'] },
  'c-pf-node-1': { id: 'c-pf-node-1', name: 'node.exe', type: 'executable', extension: 'exe', size: 75497472, dateModified: d(2026, 4, 9), dateCreated: d(2025, 6, 1), parentId: 'c-pf-nodejs' },
  'c-program-x86': { id: 'c-program-x86', name: 'Program Files (x86)', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'drive-c-root', children: [] },
  'c-users': { id: 'c-users', name: 'Users', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'drive-c-root', children: ['c-users-me', 'c-users-public'] },
  'c-users-me': { id: 'c-users-me', name: 'Utilisateur', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'c-users', children: ['desktop', 'downloads', 'documents', 'pictures', 'music', 'videos'] },
  'c-users-public': { id: 'c-users-public', name: 'Public', type: 'folder', dateModified: d(2026, 1, 1), dateCreated: d(2024, 1, 1), parentId: 'c-users', children: [] },
  'c-pagefile': { id: 'c-pagefile', name: 'pagefile.sys', type: 'unknown', extension: 'sys', size: 8589934592, dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'drive-c-root', isHidden: true },
  'c-hiberfil': { id: 'c-hiberfil', name: 'hiberfil.sys', type: 'unknown', extension: 'sys', size: 6442450944, dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'drive-c-root', isHidden: true },

  // ── Drive D ──
  'drive-d-root': { id: 'drive-d-root', name: 'Data (D:)', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'root', children: ['d-projects', 'd-games', 'd-backups', 'd-media'] },
  'd-projects': { id: 'd-projects', name: 'Projects', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2025, 1, 1), parentId: 'drive-d-root', children: ['d-p1', 'd-p2', 'd-p3', 'd-p4'] },
  'd-p1': { id: 'd-p1', name: 'webapp-react', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2026, 1, 15), parentId: 'd-projects', children: ['d-p1-f1', 'd-p1-f2', 'd-p1-f3', 'd-p1-f4', 'd-p1-f5'] },
  'd-p1-f1': { id: 'd-p1-f1', name: 'package.json', type: 'code', extension: 'json', size: 4096, dateModified: d(2026, 4, 10), dateCreated: d(2026, 1, 15), parentId: 'd-p1' },
  'd-p1-f2': { id: 'd-p1-f2', name: 'tsconfig.json', type: 'code', extension: 'json', size: 2048, dateModified: d(2026, 4, 10), dateCreated: d(2026, 1, 15), parentId: 'd-p1' },
  'd-p1-f3': { id: 'd-p1-f3', name: 'index.tsx', type: 'code', extension: 'tsx', size: 8192, dateModified: d(2026, 4, 10), dateCreated: d(2026, 1, 15), parentId: 'd-p1' },
  'd-p1-f4': { id: 'd-p1-f4', name: 'README.md', type: 'code', extension: 'md', size: 3072, dateModified: d(2026, 4, 8), dateCreated: d(2026, 1, 15), parentId: 'd-p1' },
  'd-p1-f5': { id: 'd-p1-f5', name: '.gitignore', type: 'text', extension: 'gitignore', size: 512, dateModified: d(2026, 1, 15), dateCreated: d(2026, 1, 15), parentId: 'd-p1', isHidden: true },
  'd-p2': { id: 'd-p2', name: 'api-python', type: 'folder', dateModified: d(2026, 3, 28), dateCreated: d(2025, 11, 1), parentId: 'd-projects', children: ['d-p2-f1', 'd-p2-f2'] },
  'd-p2-f1': { id: 'd-p2-f1', name: 'main.py', type: 'code', extension: 'py', size: 12288, dateModified: d(2026, 3, 28), dateCreated: d(2025, 11, 1), parentId: 'd-p2' },
  'd-p2-f2': { id: 'd-p2-f2', name: 'requirements.txt', type: 'text', extension: 'txt', size: 256, dateModified: d(2026, 3, 20), dateCreated: d(2025, 11, 1), parentId: 'd-p2' },
  'd-p3': { id: 'd-p3', name: 'mobile-flutter', type: 'folder', dateModified: d(2026, 4, 5), dateCreated: d(2026, 2, 1), parentId: 'd-projects', children: [] },
  'd-p4': { id: 'd-p4', name: 'devops-scripts', type: 'folder', dateModified: d(2026, 4, 2), dateCreated: d(2025, 9, 1), parentId: 'd-projects', children: ['d-p4-f1'] },
  'd-p4-f1': { id: 'd-p4-f1', name: 'deploy.sh', type: 'code', extension: 'sh', size: 4096, dateModified: d(2026, 4, 2), dateCreated: d(2025, 9, 1), parentId: 'd-p4' },
  'd-games': { id: 'd-games', name: 'Games', type: 'folder', dateModified: d(2026, 4, 8), dateCreated: d(2024, 6, 1), parentId: 'drive-d-root', children: ['d-g1', 'd-g2'] },
  'd-g1': { id: 'd-g1', name: 'Steam', type: 'folder', dateModified: d(2026, 4, 8), dateCreated: d(2024, 6, 1), parentId: 'd-games', children: [] },
  'd-g2': { id: 'd-g2', name: 'Epic Games', type: 'folder', dateModified: d(2026, 3, 15), dateCreated: d(2025, 3, 1), parentId: 'd-games', children: [] },
  'd-backups': { id: 'd-backups', name: 'Backups', type: 'folder', dateModified: d(2026, 4, 1), dateCreated: d(2024, 3, 1), parentId: 'drive-d-root', children: ['d-bak-1', 'd-bak-2'] },
  'd-bak-1': { id: 'd-bak-1', name: 'system-image-2026-03.wim', type: 'archive', extension: 'wim', size: 32212254720, dateModified: d(2026, 3, 1), dateCreated: d(2026, 3, 1), parentId: 'd-backups' },
  'd-bak-2': { id: 'd-bak-2', name: 'photos-backup-2025.tar.gz', type: 'archive', extension: 'tar.gz', size: 10737418240, dateModified: d(2025, 12, 31), dateCreated: d(2025, 12, 31), parentId: 'd-backups' },
  'd-media': { id: 'd-media', name: 'Media', type: 'folder', dateModified: d(2026, 4, 5), dateCreated: d(2025, 1, 1), parentId: 'drive-d-root', children: ['d-media-1', 'd-media-2'] },
  'd-media-1': { id: 'd-media-1', name: 'Films', type: 'folder', dateModified: d(2026, 4, 5), dateCreated: d(2025, 1, 1), parentId: 'd-media', children: [] },
  'd-media-2': { id: 'd-media-2', name: 'Séries', type: 'folder', dateModified: d(2026, 3, 20), dateCreated: d(2025, 1, 1), parentId: 'd-media', children: [] },

  // ── Drive E ──
  'drive-e-root': { id: 'drive-e-root', name: 'Backup (E:)', type: 'folder', dateModified: d(2026, 4, 1), dateCreated: d(2025, 1, 1), parentId: 'root', children: ['e-photos', 'e-archives', 'e-documents'] },
  'e-photos': { id: 'e-photos', name: 'Photos Archive', type: 'folder', dateModified: d(2026, 3, 15), dateCreated: d(2025, 1, 1), parentId: 'drive-e-root', children: ['e-ph-1', 'e-ph-2'] },
  'e-ph-1': { id: 'e-ph-1', name: '2024', type: 'folder', dateModified: d(2025, 1, 1), dateCreated: d(2024, 1, 1), parentId: 'e-photos', children: [] },
  'e-ph-2': { id: 'e-ph-2', name: '2025', type: 'folder', dateModified: d(2026, 1, 1), dateCreated: d(2025, 1, 1), parentId: 'e-photos', children: [] },
  'e-archives': { id: 'e-archives', name: 'System Backups', type: 'folder', dateModified: d(2026, 4, 1), dateCreated: d(2025, 6, 1), parentId: 'drive-e-root', children: [] },
  'e-documents': { id: 'e-documents', name: 'Documents Archive', type: 'folder', dateModified: d(2026, 2, 1), dateCreated: d(2025, 6, 1), parentId: 'drive-e-root', children: [] },

  // ── Drive F (USB) ──
  'drive-f-root': { id: 'drive-f-root', name: 'USB Drive (F:)', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2026, 4, 10), parentId: 'root', children: ['f-docs', 'f-readme', 'f-portable'] },
  'f-docs': { id: 'f-docs', name: 'Transfer', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2026, 4, 10), parentId: 'drive-f-root', children: ['f-docs-1'] },
  'f-docs-1': { id: 'f-docs-1', name: 'presentation-final.pptx', type: 'presentation', extension: 'pptx', size: 25165824, dateModified: d(2026, 4, 10), dateCreated: d(2026, 4, 10), parentId: 'f-docs' },
  'f-readme': { id: 'f-readme', name: 'README.txt', type: 'text', extension: 'txt', size: 512, dateModified: d(2026, 4, 10), dateCreated: d(2026, 4, 10), parentId: 'drive-f-root' },
  'f-portable': { id: 'f-portable', name: 'PortableApps', type: 'folder', dateModified: d(2026, 4, 8), dateCreated: d(2026, 3, 1), parentId: 'drive-f-root', children: [] },

  // ── Network locations as navigable folders ──
  'net-gdrive-root': { id: 'net-gdrive-root', name: 'Google Drive', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 6, 1), parentId: 'network-root', children: ['gdrive-1', 'gdrive-2', 'gdrive-3'] },
  'gdrive-1': { id: 'gdrive-1', name: 'Partagés avec moi', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 6, 1), parentId: 'net-gdrive-root', children: ['gdrive-1-1'] },
  'gdrive-1-1': { id: 'gdrive-1-1', name: 'brief-client-2026.pdf', type: 'pdf', extension: 'pdf', size: 4194304, dateModified: d(2026, 4, 8), dateCreated: d(2026, 4, 8), parentId: 'gdrive-1' },
  'gdrive-2': { id: 'gdrive-2', name: 'Mon Drive', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 6, 1), parentId: 'net-gdrive-root', children: ['gdrive-2-1', 'gdrive-2-2'] },
  'gdrive-2-1': { id: 'gdrive-2-1', name: 'notes-cours.docx', type: 'document', extension: 'docx', size: 286720, dateModified: d(2026, 4, 5), dateCreated: d(2026, 2, 1), parentId: 'gdrive-2' },
  'gdrive-2-2': { id: 'gdrive-2-2', name: 'budget-famille.xlsx', type: 'spreadsheet', extension: 'xlsx', size: 163840, dateModified: d(2026, 4, 3), dateCreated: d(2025, 12, 1), parentId: 'gdrive-2' },
  'gdrive-3': { id: 'gdrive-3', name: 'Photos sync', type: 'folder', dateModified: d(2026, 4, 9), dateCreated: d(2025, 1, 1), parentId: 'net-gdrive-root', children: [] },

  'net-onedrive-root': { id: 'net-onedrive-root', name: 'OneDrive', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2025, 1, 1), parentId: 'network-root', children: ['onedrive-1', 'onedrive-2'] },
  'onedrive-1': { id: 'onedrive-1', name: 'Documents Office', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2025, 1, 1), parentId: 'net-onedrive-root', children: ['onedrive-1-1'] },
  'onedrive-1-1': { id: 'onedrive-1-1', name: 'rapport-equipe.docx', type: 'document', extension: 'docx', size: 573440, dateModified: d(2026, 4, 10), dateCreated: d(2026, 3, 1), parentId: 'onedrive-1' },
  'onedrive-2': { id: 'onedrive-2', name: 'Pièces jointes', type: 'folder', dateModified: d(2026, 4, 8), dateCreated: d(2025, 6, 1), parentId: 'net-onedrive-root', children: [] },

  'net-nas-root': { id: 'net-nas-root', name: 'NAS-Home', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: 'network-root', children: ['nas-1', 'nas-2', 'nas-3'] },
  'nas-1': { id: 'nas-1', name: 'shared-media', type: 'folder', dateModified: d(2026, 4, 5), dateCreated: d(2024, 1, 1), parentId: 'net-nas-root', children: [] },
  'nas-2': { id: 'nas-2', name: 'backups-auto', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 6, 1), parentId: 'net-nas-root', children: [] },
  'nas-3': { id: 'nas-3', name: 'public', type: 'folder', dateModified: d(2026, 3, 1), dateCreated: d(2024, 1, 1), parentId: 'net-nas-root', children: [] },

  'net-ftp-root': { id: 'net-ftp-root', name: 'FTP Server', type: 'folder', dateModified: d(2026, 4, 1), dateCreated: d(2025, 1, 1), parentId: 'network-root', children: ['ftp-1'] },
  'ftp-1': { id: 'ftp-1', name: 'uploads', type: 'folder', dateModified: d(2026, 4, 1), dateCreated: d(2025, 1, 1), parentId: 'net-ftp-root', children: [], isReadOnly: true },

  // ── Recycle bin ──
  'recycle-bin': { id: 'recycle-bin', name: 'Corbeille', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 1, 1), parentId: null, children: ['trash-1', 'trash-2', 'trash-3'] },
  'trash-1': { id: 'trash-1', name: 'old-report.docx', type: 'document', extension: 'docx', size: 524288, dateModified: d(2026, 4, 5), dateCreated: d(2026, 2, 1), parentId: 'recycle-bin' },
  'trash-2': { id: 'trash-2', name: 'temp-data.csv', type: 'spreadsheet', extension: 'csv', size: 131072, dateModified: d(2026, 4, 8), dateCreated: d(2026, 4, 1), parentId: 'recycle-bin' },
  'trash-3': { id: 'trash-3', name: 'brouillon-email.txt', type: 'text', extension: 'txt', size: 2048, dateModified: d(2026, 4, 9), dateCreated: d(2026, 4, 9), parentId: 'recycle-bin' },

  // ── Mobile (Redmi A2+) ──
  'mobile-root': { id: 'mobile-root', name: 'Redmi A2+', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 6, 1), parentId: null, children: ['mobile-internal', 'mobile-sd'] },
  'mobile-internal': { id: 'mobile-internal', name: 'Mémoire interne', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 6, 1), parentId: 'mobile-root', children: ['m-dcim', 'm-download', 'm-music', 'm-movies', 'm-documents', 'm-whatsapp'] },
  'm-dcim': { id: 'm-dcim', name: 'DCIM', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 6, 1), parentId: 'mobile-internal', children: ['m-dcim-1', 'm-dcim-2'] },
  'm-dcim-1': { id: 'm-dcim-1', name: 'IMG_20260410_142301.jpg', type: 'image', extension: 'jpg', size: 3145728, dateModified: d(2026, 4, 10, 14, 23), dateCreated: d(2026, 4, 10, 14, 23), parentId: 'm-dcim', thumbnail: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=200&h=150&fit=crop' },
  'm-dcim-2': { id: 'm-dcim-2', name: 'VID_20260409_180142.mp4', type: 'video', extension: 'mp4', size: 52428800, dateModified: d(2026, 4, 9, 18, 1), dateCreated: d(2026, 4, 9, 18, 1), parentId: 'm-dcim' },
  'm-download': { id: 'm-download', name: 'Download', type: 'folder', dateModified: d(2026, 4, 9), dateCreated: d(2024, 6, 1), parentId: 'mobile-internal', children: [] },
  'm-music': { id: 'm-music', name: 'Music', type: 'folder', dateModified: d(2026, 4, 5), dateCreated: d(2024, 6, 1), parentId: 'mobile-internal', children: [] },
  'm-movies': { id: 'm-movies', name: 'Movies', type: 'folder', dateModified: d(2026, 3, 20), dateCreated: d(2024, 6, 1), parentId: 'mobile-internal', children: [] },
  'm-documents': { id: 'm-documents', name: 'Documents', type: 'folder', dateModified: d(2026, 4, 1), dateCreated: d(2024, 6, 1), parentId: 'mobile-internal', children: [] },
  'm-whatsapp': { id: 'm-whatsapp', name: 'WhatsApp', type: 'folder', dateModified: d(2026, 4, 10), dateCreated: d(2024, 6, 1), parentId: 'mobile-internal', children: [] },
  'mobile-sd': { id: 'mobile-sd', name: 'Carte SD', type: 'folder', dateModified: d(2026, 4, 8), dateCreated: d(2024, 6, 1), parentId: 'mobile-root', children: ['m-sd-backup', 'm-sd-pictures'] },
  'm-sd-backup': { id: 'm-sd-backup', name: 'Backup', type: 'folder', dateModified: d(2026, 4, 8), dateCreated: d(2025, 1, 1), parentId: 'mobile-sd', children: [] },
  'm-sd-pictures': { id: 'm-sd-pictures', name: 'Pictures', type: 'folder', dateModified: d(2026, 3, 1), dateCreated: d(2024, 6, 1), parentId: 'mobile-sd', children: [] },
};

export const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === null) return '';
  if (bytes === 0) return '0 o';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
};

export const getFileTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    folder: 'Dossier de fichiers',
    image: 'Fichier image',
    document: 'Document Microsoft Word',
    video: 'Fichier vidéo',
    audio: 'Fichier audio',
    code: 'Fichier source',
    archive: 'Archive compressée',
    executable: 'Application',
    text: 'Document texte',
    pdf: 'Document PDF',
    spreadsheet: 'Feuille de calcul Microsoft Excel',
    presentation: 'Présentation Microsoft PowerPoint',
    font: 'Fichier de police',
    database: 'Fichier de base de données',
    unknown: 'Fichier',
  };
  return labels[type] || 'Fichier';
};

// Helper to get ancestors
export function getAncestors(id: string): string[] {
  const ancestors: string[] = [];
  let current = fileSystem[id];
  while (current?.parentId) {
    ancestors.push(current.parentId);
    current = fileSystem[current.parentId];
  }
  return ancestors;
}
