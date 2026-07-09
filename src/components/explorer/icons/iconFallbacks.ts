// Inline SVG fallbacks (always available, no network). Used when CDN icons fail
// to load — e.g. Electron offline, slow network, CSP. Keep them visually
// consistent with Material Icon Theme (folder = indigo, drive = teal, etc).

const svg = (body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${body}</svg>`)}`;

// Folder (generic) — classic yellow (Windows/macOS style)
export const fbFolder = svg(
  `<path fill="#ffb74d" d="M13.71 5H4a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H15.71l-2-2z"/>` +
  `<path fill="#ffa726" d="M2 9v16a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9z"/>`
);
export const fbFolderOpen = svg(
  `<path fill="#ffb74d" d="M28 9H15.71l-2-2H4a2 2 0 0 0-2 2v18h28V11a2 2 0 0 0-2-2z"/>` +
  `<path fill="#ffcc80" d="M30 13H6l-4 14h24z"/>`
);
// Windows folder — blue
export const fbFolderWindows = svg(
  `<path fill="#42a5f5" d="M13.71 5H4a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H15.71l-2-2z"/>` +
  `<path fill="#1e88e5" d="M2 9v16a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9z"/>` +
  `<path fill="#fff" d="M11 14h4v4h-4zm6 0h4v4h-4zm-6 6h4v4h-4zm6 0h4v4h-4z"/>`
);
// Database folder — teal
export const fbFolderDatabase = svg(
  `<path fill="#26a69a" d="M13.71 5H4a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H15.71l-2-2z"/>` +
  `<path fill="#00897b" d="M2 9v16a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9z"/>` +
  `<ellipse cx="16" cy="14" rx="5" ry="1.5" fill="#fff"/>` +
  `<path fill="#fff" d="M11 14v6c0 .8 2.2 1.5 5 1.5s5-.7 5-1.5v-6c0 .8-2.2 1.5-5 1.5s-5-.7-5-1.5z"/>`
);
// Desktop folder — orange
export const fbFolderDesktop = svg(
  `<path fill="#ff9800" d="M13.71 5H4a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H15.71l-2-2z"/>` +
  `<path fill="#f57c00" d="M2 9v16a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9z"/>` +
  `<rect x="9" y="13" width="14" height="9" rx="1" fill="#fff"/>` +
  `<rect x="14" y="22" width="4" height="2" fill="#fff"/>`
);
// Downloads — green
export const fbFolderDownload = svg(
  `<path fill="#66bb6a" d="M13.71 5H4a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H15.71l-2-2z"/>` +
  `<path fill="#43a047" d="M2 9v16a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9z"/>` +
  `<path fill="#fff" d="M17 13h-2v5h-3l4 5 4-5h-3z"/>`
);
// Documents — light blue
export const fbFolderResource = svg(
  `<path fill="#42a5f5" d="M13.71 5H4a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H15.71l-2-2z"/>` +
  `<path fill="#1e88e5" d="M2 9v16a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9z"/>` +
  `<path fill="#fff" d="M12 13h8v2h-8zm0 3h8v2h-8zm0 3h6v2h-6z"/>`
);
// Pictures — pink
export const fbFolderImages = svg(
  `<path fill="#ec407a" d="M13.71 5H4a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H15.71l-2-2z"/>` +
  `<path fill="#d81b60" d="M2 9v16a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9z"/>` +
  `<circle cx="13" cy="15" r="1.5" fill="#fff"/>` +
  `<path fill="#fff" d="M10 23l4-5 3 3 4-5 4 7z"/>`
);
// Music — purple
export const fbFolderAudio = svg(
  `<path fill="#ab47bc" d="M13.71 5H4a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H15.71l-2-2z"/>` +
  `<path fill="#8e24aa" d="M2 9v16a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9z"/>` +
  `<path fill="#fff" d="M19 13v6.5a2.5 2.5 0 1 1-2-2.45V14h-3v5.5a2.5 2.5 0 1 1-2-2.45V13z"/>`
);
// Videos — red
export const fbFolderVideo = svg(
  `<path fill="#ef5350" d="M13.71 5H4a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H15.71l-2-2z"/>` +
  `<path fill="#e53935" d="M2 9v16a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9z"/>` +
  `<path fill="#fff" d="M13 14v8l8-4z"/>`
);
// Archive / backup — brown
export const fbFolderArchive = svg(
  `<path fill="#8d6e63" d="M13.71 5H4a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H15.71l-2-2z"/>` +
  `<path fill="#6d4c41" d="M2 9v16a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9z"/>` +
  `<path fill="#fff" d="M15 13h2v2h-2zm0 3h2v2h-2zm0 3h2v2h-2z"/>`
);
// Server / NAS — slate
export const fbFolderServer = svg(
  `<path fill="#546e7a" d="M13.71 5H4a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H15.71l-2-2z"/>` +
  `<path fill="#37474f" d="M2 9v16a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V9z"/>` +
  `<rect x="9" y="13" width="14" height="3" rx=".5" fill="#fff"/>` +
  `<rect x="9" y="18" width="14" height="3" rx=".5" fill="#fff"/>` +
  `<circle cx="11" cy="14.5" r=".7" fill="#26a69a"/>` +
  `<circle cx="11" cy="19.5" r=".7" fill="#26a69a"/>`
);
// This PC — desktop computer
export const fbThisPC = svg(
  `<rect x="3" y="5" width="26" height="17" rx="2" fill="#37474f"/>` +
  `<rect x="5" y="7" width="22" height="13" fill="#4fc3f7"/>` +
  `<path fill="#37474f" d="M12 22h8l1 4h-10z"/>` +
  `<rect x="9" y="26" width="14" height="1.5" rx=".75" fill="#37474f"/>`
);
// Generic drive — HDD shape
export const fbDrive = svg(
  `<rect x="3" y="9" width="26" height="14" rx="2" fill="#455a64"/>` +
  `<rect x="3" y="9" width="26" height="7" rx="2" fill="#607d8b"/>` +
  `<circle cx="25" cy="19" r="1" fill="#4fc3f7"/>` +
  `<rect x="6" y="11" width="14" height="2" rx="1" fill="#cfd8dc"/>`
);
// System drive — blue accent
export const fbDriveSystem = svg(
  `<rect x="3" y="9" width="26" height="14" rx="2" fill="#1565c0"/>` +
  `<rect x="3" y="9" width="26" height="7" rx="2" fill="#1e88e5"/>` +
  `<circle cx="25" cy="19" r="1" fill="#fff"/>` +
  `<rect x="6" y="11" width="14" height="2" rx="1" fill="#bbdefb"/>`
);
// Network globe
export const fbNetwork = svg(
  `<circle cx="16" cy="16" r="12" fill="#4fc3f7"/>` +
  `<ellipse cx="16" cy="16" rx="12" ry="5" fill="none" stroke="#fff" stroke-width="1.2"/>` +
  `<ellipse cx="16" cy="16" rx="5" ry="12" fill="none" stroke="#fff" stroke-width="1.2"/>` +
  `<circle cx="16" cy="16" r="12" fill="none" stroke="#fff" stroke-width="1.2"/>`
);
// Cloud
export const fbCloud = svg(
  `<path fill="#90caf9" d="M24 14a6 6 0 0 0-11.7-1.7A5 5 0 0 0 8 22h16a4 4 0 0 0 0-8z"/>`
);
// Phone
export const fbPhone = svg(
  `<rect x="9" y="3" width="14" height="26" rx="2" fill="#37474f"/>` +
  `<rect x="10.5" y="6" width="11" height="18" fill="#4fc3f7"/>` +
  `<circle cx="16" cy="26.5" r="1" fill="#90a4ae"/>`
);
// Trash empty
export const fbTrash = svg(
  `<path fill="#90a4ae" d="M8 11h16l-1.5 16a2 2 0 0 1-2 1.8h-9a2 2 0 0 1-2-1.8z"/>` +
  `<rect x="6" y="8" width="20" height="3" rx="1" fill="#607d8b"/>` +
  `<rect x="13" y="5" width="6" height="3" rx=".5" fill="#607d8b"/>`
);
// USB stick
export const fbUSB = svg(
  `<rect x="6" y="13" width="20" height="6" rx="1" fill="#455a64"/>` +
  `<rect x="2" y="14" width="4" height="4" fill="#90a4ae"/>` +
  `<rect x="8" y="15" width="2" height="2" fill="#4fc3f7"/>` +
  `<rect x="11" y="15" width="2" height="2" fill="#4fc3f7"/>`
);
// Generic file
export const fbFile = svg(
  `<path fill="#90a4ae" d="M8 3h11l7 7v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>` +
  `<path fill="#cfd8dc" d="M19 3v7h7z"/>`
);

// Convenience map from a FileType to its inline SVG fallback
import type { FileType } from '@/types/fileExplorer';

export function getFallbackIcon(type: FileType | string | undefined): string {
  switch (type) {
    case 'folder': return fbFolder;
    case 'image': return fbFile;
    case 'video': return fbFile;
    case 'audio': return fbFile;
    default: return fbFile;
  }
}
