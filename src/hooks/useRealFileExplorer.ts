import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useSystemBridge } from '@/hooks/useSystemBridge';
import type { FileItem, FileType, SortDirection, SortField, ViewMode } from '@/types/fileExplorer';

const DIRECTORY_CACHE_TTL = 10_000;
const directoryCache = new Map<string, { timestamp: number; files: FileItem[] }>();

export const REAL_VIRTUAL_PATHS = {
  thisPc: 'virtual:this-pc',
  network: 'virtual:network',
  quickAccess: 'virtual:quick-access',
  trash: 'virtual:demo-trash',
} as const;

const REAL_PATH_BY_MOCK_FOLDER_ID: Record<string, string> = {
  root: REAL_VIRTUAL_PATHS.thisPc,
  home: '~',
  desktop: '~/Desktop',
  downloads: '~/Downloads',
  documents: '~/Documents',
  pictures: '~/Pictures',
  music: '~/Music',
  videos: '~/Videos',
  'network-root': REAL_VIRTUAL_PATHS.network,
  'drive-c-root': 'C:\\',
  'drive-d-root': 'D:\\',
  'drive-e-root': 'E:\\',
  'drive-f-root': 'F:\\',
  'recycle-bin': REAL_VIRTUAL_PATHS.trash,
};

const QUICK_ACCESS = [
  { id: 'qa-desktop', name: 'Bureau', path: '~/Desktop', type: 'folder' as FileType },
  { id: 'qa-downloads', name: 'Telechargements', path: '~/Downloads', type: 'folder' as FileType },
  { id: 'qa-documents', name: 'Documents', path: '~/Documents', type: 'folder' as FileType },
  { id: 'qa-pictures', name: 'Images', path: '~/Pictures', type: 'folder' as FileType },
  { id: 'qa-music', name: 'Musique', path: '~/Music', type: 'folder' as FileType },
  { id: 'qa-videos', name: 'Videos', path: '~/Videos', type: 'folder' as FileType },
];

interface RealDrive {
  mount: string;
  total: number;
  used: number;
  usage: number;
  fsType?: string;
  label?: string;
}

interface RealNetworkMount {
  name?: string;
  root?: string;
  displayRoot?: string;
  used?: number;
  free?: number;
}

interface RealLocalService {
  address?: string;
  port: number;
  pid?: number;
  processName?: string | null;
  url?: string;
}

function isVirtualPath(path: string) {
  return path.startsWith('virtual:');
}

export function resolveRealExplorerInitialPath(initialPath?: string, initialFolderId?: string) {
  if (initialPath?.trim()) return normalizeRealExplorerPath(initialPath);
  return normalizeRealExplorerPath(initialFolderId);
}

export function normalizeRealExplorerPath(path?: string) {
  if (!path?.trim()) return REAL_VIRTUAL_PATHS.thisPc;
  const trimmed = path.trim();
  const mapped = REAL_PATH_BY_MOCK_FOLDER_ID[trimmed] || trimmed;
  return canonicalizePath(mapped);
}

// Canonicalize OS paths so the same drive is never represented two ways
// (e.g. "C:" vs "C:\"), which would break navigation/cache keys/active state.
function canonicalizePath(p: string): string {
  if (!p) return p;
  if (p.startsWith('virtual:') || p.startsWith('~') || p.startsWith('mobile-')) return p;
  // Windows drive root: "C:" or "C:/" -> "C:\"
  if (/^[A-Za-z]:[\\/]?$/.test(p)) return `${p[0].toUpperCase()}:\\`;
  // Windows path: normalize slashes to backslashes, drop trailing separator (except root)
  if (/^[A-Za-z]:[\\/]/.test(p)) {
    const norm = p.replace(/\//g, '\\').replace(/\\+$/, '');
    return /^[A-Za-z]:$/.test(norm) ? `${norm}\\` : norm;
  }
  // POSIX path: collapse trailing slash (except root)
  if (p.startsWith('/')) return p.length > 1 ? p.replace(/\/+$/, '') : '/';
  return p;
}

function getExtension(name: string) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : undefined;
}

function inferFileType(name: string, isDirectory: boolean): FileType {
  if (isDirectory) return 'folder';
  const ext = getExtension(name) || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return 'audio';
  if (['js', 'jsx', 'ts', 'tsx', 'json', 'css', 'html', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'cs', 'md', 'yml', 'yaml', 'sh', 'ps1'].includes(ext)) return 'code';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['exe', 'msi', 'bat', 'cmd', 'lnk'].includes(ext)) return 'executable';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'rtf'].includes(ext)) return 'document';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
  if (['ppt', 'pptx'].includes(ext)) return 'presentation';
  if (['txt', 'log'].includes(ext)) return 'text';
  if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return 'font';
  if (['db', 'sqlite', 'sql'].includes(ext)) return 'database';
  return 'unknown';
}

function dirItemToFile(item: { name?: string; path?: string; isDirectory?: boolean; size?: number; modified?: Date | string | null }): FileItem {
  const name = item.name || item.path?.split(/[\\/]/).pop() || '';
  const isDirectory = Boolean(item.isDirectory);
  const extension = isDirectory ? undefined : getExtension(name);
  const modified = item.modified ? new Date(item.modified) : new Date();
  return {
    id: item.path || name,
    path: item.path || name,
    targetPath: item.path || name,
    name,
    type: inferFileType(name, isDirectory),
    extension,
    size: item.size || 0,
    dateModified: modified,
    dateCreated: modified,
    parentId: null,
    children: isDirectory ? [] : undefined,
    isHidden: name.startsWith('.') || name.startsWith('$'),
    isReadOnly: false,
  };
}

function joinPath(basePath: string, name: string) {
  const separator = basePath.includes('\\') || /^[A-Za-z]:/.test(basePath) ? '\\' : '/';
  const normalized = basePath.endsWith('\\') || basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return `${normalized}${separator}${name}`;
}

function parentPath(path: string) {
  if (isVirtualPath(path)) return REAL_VIRTUAL_PATHS.thisPc;
  const trimmed = path.replace(/[\\/]+$/, '');
  if (/^[A-Za-z]:$/.test(trimmed) || /^[A-Za-z]:\\?$/.test(path)) return REAL_VIRTUAL_PATHS.thisPc;
  const index = Math.max(trimmed.lastIndexOf('\\'), trimmed.lastIndexOf('/'));
  if (index <= 0) return REAL_VIRTUAL_PATHS.thisPc;
  const candidate = trimmed.slice(0, index);
  return /^[A-Za-z]:$/.test(candidate) ? `${candidate}\\` : candidate;
}

function pathSegments(path: string) {
  if (path === REAL_VIRTUAL_PATHS.thisPc) return ['Ce PC'];
  if (path === REAL_VIRTUAL_PATHS.network) return ['Reseau'];
  if (path === REAL_VIRTUAL_PATHS.quickAccess) return ['Acces rapide'];
  if (path === REAL_VIRTUAL_PATHS.trash) return ['Corbeille'];
  return path.replace(/[\\/]+$/, '').split(/[\\/]/).filter(Boolean);
}

function sortFiles(files: FileItem[], field: SortField, direction: SortDirection) {
  return [...files].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    let cmp = 0;
    if (field === 'name') cmp = a.name.localeCompare(b.name, 'fr-FR');
    if (field === 'size') cmp = (a.size || 0) - (b.size || 0);
    if (field === 'type') cmp = a.type.localeCompare(b.type, 'fr-FR');
    if (field === 'dateModified' || field === 'dateCreated') cmp = a.dateModified.getTime() - b.dateModified.getTime();
    return direction === 'asc' ? cmp : -cmp;
  });
}

export function useRealFileExplorer(initialPath?: string) {
  const bridge = useSystemBridge();
  const {
    isAvailable,
    systemInfo,
    exec,
    listDir,
    watchDir,
    invalidateExplorerDirCache,
    getDrives,
    getNetworkMounts,
    getListeningServices,
    copy,
    move,
    rename,
    mkdir,
  } = bridge;
  const normalizedInitialPath = normalizeRealExplorerPath(initialPath);
  const [currentPath, setCurrentPath] = useState(normalizedInitialPath);
  const [history, setHistory] = useState<string[]>([normalizedInitialPath]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showExtensions, setShowExtensions] = useState(true);
  const [iconSize, setIconSize] = useState(80);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<{ items: string[]; operation: 'copy' | 'cut' | null }>({ items: [], operation: null });
  const [drives, setDrives] = useState<RealDrive[]>([]);
  const [networkMounts, setNetworkMounts] = useState<RealNetworkMount[]>([]);
  const [localServices, setLocalServices] = useState<RealLocalService[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef<string | null>(null);

  const refreshSystemSnapshots = useCallback(async (opts?: { includeNetwork?: boolean }) => {
    if (!isAvailable) return;
    const driveResult = await getDrives();
    setDrives(driveResult.data || []);
    if (opts?.includeNetwork) {
      const [networkResult, serviceResult] = await Promise.all([getNetworkMounts(), getListeningServices()]);
      setNetworkMounts(networkResult.data || []);
      setLocalServices(serviceResult.data || []);
    }
  }, [getDrives, getListeningServices, getNetworkMounts, isAvailable]);

  const buildVirtualFiles = useCallback((path: string): FileItem[] => {
    if (path === REAL_VIRTUAL_PATHS.network) {
      const mounts = networkMounts.map((mount, index): FileItem => {
        const target = mount.displayRoot || mount.root || mount.name || `network:${index}`;
        return {
          id: target, path: target, targetPath: target, name: mount.name || target, type: 'folder', size: (mount.used || 0) + (mount.free || 0),
          dateModified: new Date(), dateCreated: new Date(), parentId: null, children: [], isHidden: false,
        };
      });
      const services = localServices.map((service): FileItem => ({
        id: `service:${service.port}`, path: service.url || `http://localhost:${service.port}`, targetPath: service.url || `http://localhost:${service.port}`,
        name: service.processName || `localhost:${service.port}`, type: 'unknown', size: 0,
        dateModified: new Date(), dateCreated: new Date(), parentId: null, isHidden: false,
      }));
      return [...mounts, ...services];
    }

    const driveItems = drives.map((drive): FileItem => ({
      id: drive.mount, path: drive.mount, targetPath: drive.mount, name: drive.label || drive.mount, type: 'folder',
      size: drive.total, dateModified: new Date(), dateCreated: new Date(), parentId: null, children: [], isHidden: false,
      driveInfo: drive,
    } as FileItem));
    const quickItems = QUICK_ACCESS.map((item): FileItem => ({
      id: item.path, path: item.path, targetPath: item.path, name: item.name, type: item.type,
      size: 0, dateModified: new Date(), dateCreated: new Date(), parentId: null, children: [], isHidden: false,
    }));
    return [...quickItems, ...driveItems];
  }, [drives, localServices, networkMounts]);

  const loadDirectory = useCallback(async (path: string, force = false) => {
    if (isVirtualPath(path)) {
      const next = buildVirtualFiles(path);
      startTransition(() => {
        setFiles(next);
        setIsLoading(false);
        setError(null);
        setSelectedItems([]);
      });
      return;
    }
    if (!isAvailable) return;

    const cached = directoryCache.get(path);
    const fresh = cached && Date.now() - cached.timestamp < DIRECTORY_CACHE_TTL;

    // SWR: paint cache instantly, refresh in background unless forced.
    if (cached) {
      startTransition(() => {
        setFiles(cached.files);
        setError(null);
        setSelectedItems([]);
      });
      if (fresh && !force) return;
    } else {
      setIsLoading(true);
    }

    const requestId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    requestIdRef.current = requestId;
    try {
      const result: any = await listDir(path, { showHidden: true, requestId });
      if (result?.requestId && requestIdRef.current !== result.requestId) return;
      const items = result?.items || result?.data || [];
      if (!result?.success && !items.length) throw new Error(result?.error || 'Impossible de charger le dossier');
      const nextFiles = items.map(dirItemToFile);
      directoryCache.set(path, { timestamp: Date.now(), files: nextFiles });
      startTransition(() => {
        setFiles(nextFiles);
        setError(result?.success ? null : result?.error || null);
        if (!cached) setSelectedItems([]);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Impossible de charger le dossier';
      startTransition(() => {
        setError(msg);
        if (!cached) setFiles([]);
      });
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }, [buildVirtualFiles, isAvailable, listDir]);

  useEffect(() => { void refreshSystemSnapshots(); }, [refreshSystemSnapshots]);
  // Only fetch network/services when actually viewing the Network virtual folder.
  useEffect(() => {
    if (currentPath === REAL_VIRTUAL_PATHS.network) void refreshSystemSnapshots({ includeNetwork: true });
  }, [currentPath, refreshSystemSnapshots]);
  useEffect(() => { void loadDirectory(currentPath); }, [currentPath, loadDirectory]);
  // Keep virtual views (Ce PC / Réseau) in sync as drive / network snapshots stream in.
  useEffect(() => {
    if (isVirtualPath(currentPath)) setFiles(buildVirtualFiles(currentPath));
  }, [currentPath, drives, networkMounts, localServices, buildVirtualFiles]);
  useEffect(() => {
    if (!isAvailable || isVirtualPath(currentPath)) return;
    const cleanup = watchDir(currentPath, () => {
      directoryCache.delete(currentPath);
      void invalidateExplorerDirCache(currentPath);
      void loadDirectory(currentPath, true);
    });
    return cleanup;
  }, [currentPath, invalidateExplorerDirCache, isAvailable, loadDirectory, watchDir]);

  const navigateTo = useCallback((path: string, push = true) => {
    const nextPath = normalizeRealExplorerPath(path);
    setCurrentPath(nextPath);
    setSearchQuery('');
    setRenamingId(null);
    if (push) {
      setHistory((prev) => {
        const next = [...prev.slice(0, historyIndex + 1), nextPath];
        setHistoryIndex(next.length - 1);
        return next;
      });
    }
  }, [historyIndex]);

  const goBack = useCallback(() => {
    setHistoryIndex((index) => {
      if (index <= 0) return index;
      const nextIndex = index - 1;
      setCurrentPath(history[nextIndex]);
      return nextIndex;
    });
  }, [history]);

  const goForward = useCallback(() => {
    setHistoryIndex((index) => {
      if (index >= history.length - 1) return index;
      const nextIndex = index + 1;
      setCurrentPath(history[nextIndex]);
      return nextIndex;
    });
  }, [history]);

  const goUp = useCallback(() => navigateTo(parentPath(currentPath)), [currentPath, navigateTo]);

  const deferredSearch = useDeferredValue(searchQuery);
  const currentChildren = useMemo(() => {
    let list = showHidden ? files : files.filter((file) => !file.isHidden);
    if (deferredSearch) list = list.filter((file) => file.name.toLowerCase().includes(deferredSearch.toLowerCase()));
    return sortFiles(list, sortField, sortDirection);
  }, [files, deferredSearch, showHidden, sortDirection, sortField]);

  const selectItem = useCallback((id: string, mode: 'single' | 'ctrl' | 'shift' = 'single') => {
    setSelectedItems((previous) => {
      if (mode === 'ctrl') {
        setSelectionAnchor(id);
        return previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id];
      }
      if (mode === 'shift' && selectionAnchor) {
        const ids = currentChildren.map((file) => file.id);
        const a = ids.indexOf(selectionAnchor);
        const b = ids.indexOf(id);
        if (a >= 0 && b >= 0) return ids.slice(Math.min(a, b), Math.max(a, b) + 1);
      }
      setSelectionAnchor(id);
      return [id];
    });
  }, [currentChildren, selectionAnchor]);

  const clearSelection = useCallback(() => { setSelectedItems([]); setSelectionAnchor(null); }, []);
  const selectAll = useCallback(() => setSelectedItems(currentChildren.map((file) => file.id)), [currentChildren]);

  const openItem = useCallback(async (id: string) => {
    const item = files.find((file) => file.id === id) || currentChildren.find((file) => file.id === id);
    if (!item) return;
    const target = item.targetPath || item.path || item.id;
    if (item.type === 'folder' || target.startsWith('virtual:')) {
      navigateTo(target);
      return;
    }
    const platform = systemInfo?.platform;
    if (platform === 'win32') await exec(`Start-Process -FilePath "${target}"`);
    else if (platform === 'darwin') await exec(`open "${target}"`);
    else await exec(`xdg-open "${target}"`);
  }, [currentChildren, exec, files, navigateTo, systemInfo?.platform]);

  const copyItems = useCallback((ids: string[]) => setClipboard({ items: ids, operation: 'copy' }), []);
  const cutItems = useCallback((ids: string[]) => setClipboard({ items: ids, operation: 'cut' }), []);

  const pasteItems = useCallback(async (targetPath = currentPath) => {
    if (!clipboard.operation || clipboard.items.length === 0 || isVirtualPath(targetPath)) return 0;
    if (!confirm(`${clipboard.operation === 'cut' ? 'Deplacer' : 'Copier'} ${clipboard.items.length} element(s) vers ${targetPath} ?`)) return 0;
    let count = 0;
    for (const id of clipboard.items) {
      const source = files.find((file) => file.id === id)?.path || id;
      const name = source.replace(/\\/g, '/').split('/').pop() || 'item';
      const dest = joinPath(targetPath, name);
      const result = clipboard.operation === 'cut' ? await move(source, dest) : await copy(source, dest);
      if (result.success) count++;
    }
    if (clipboard.operation === 'cut' && count === clipboard.items.length) setClipboard({ items: [], operation: null });
    await loadDirectory(currentPath, true);
    return count;
  }, [clipboard, copy, currentPath, files, loadDirectory, move]);

  const deleteItems = useCallback(async (ids: string[]) => {
    if (ids.length === 0 || isVirtualPath(currentPath)) return;
    if (!confirm(`Suppression reelle desactivee en mode prudent. Retirer ${ids.length} element(s) de la selection ?`)) return;
    clearSelection();
  }, [clearSelection, currentPath]);

  const startRename = useCallback((id: string) => { setRenamingId(id); selectItem(id); }, [selectItem]);
  const confirmRename = useCallback(async (id: string, newName: string) => {
    const item = files.find((file) => file.id === id);
    if (!item || !newName.trim() || isVirtualPath(currentPath)) { setRenamingId(null); return; }
    if (!confirm(`Renommer "${item.name}" en "${newName.trim()}" ?`)) { setRenamingId(null); return; }
    const result = await rename(item.path || id, joinPath(parentPath(item.path || id), newName.trim()));
    setRenamingId(null);
    if (result.success) await loadDirectory(currentPath, true);
  }, [currentPath, files, loadDirectory, rename]);

  const createFolder = useCallback(async () => {
    if (isVirtualPath(currentPath)) return;
    const name = prompt('Nom du nouveau dossier :', 'Nouveau dossier');
    if (!name?.trim()) return;
    if (!confirm(`Creer le dossier "${name.trim()}" dans ${currentPath} ?`)) return;
    const result = await mkdir(joinPath(currentPath, name.trim()));
    if (result.success) await loadDirectory(currentPath, true);
  }, [currentPath, loadDirectory, mkdir]);

  const getItemName = useCallback((id: string) => files.find((file) => file.id === id)?.name || id.replace(/\\/g, '/').split('/').pop() || id, [files]);
  const buildFullPath = useCallback((id: string) => files.find((file) => file.id === id)?.path || id, [files]);
  const setSort = useCallback((field: SortField) => {
    setSortField((previous) => {
      if (previous === field) setSortDirection((dir) => dir === 'asc' ? 'desc' : 'asc');
      else setSortDirection('asc');
      return field;
    });
  }, []);

  return {
    isReal: true,
    isAvailable,
    nav: {
      location: { type: isVirtualPath(currentPath) ? 'virtual' : 'directory', id: currentPath, folderId: currentPath },
      currentPath: pathSegments(currentPath),
      currentFolderId: currentPath,
      history,
      historyIndex,
      selectedItems,
      selectionAnchor,
      viewMode,
      sortField,
      sortDirection,
      searchQuery,
      showPreview,
      iconSize,
      expandedNodes: new Set<string>(),
      renamingId,
    },
    currentFolder: null,
    currentChildren,
    files,
    drives,
    networkMounts,
    localServices,
    isLoading,
    error,
    navigateTo,
    navigateToLocation: (loc: { type: string; id?: string; folderId?: string }) => navigateTo(loc.type === 'directory' ? loc.folderId || REAL_VIRTUAL_PATHS.thisPc : `virtual:${loc.id}`),
    goBack,
    goForward,
    goUp,
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < history.length - 1,
    canGoUp: currentPath !== REAL_VIRTUAL_PATHS.thisPc,
    selectItem,
    clearSelection,
    selectAll,
    setViewMode,
    setSort,
    setSearchQuery,
    togglePreview: () => setShowPreview((value) => !value),
    openPreview: () => setShowPreview(true),
    setIconSize,
    toggleExpanded: () => {},
    clipboard,
    copyItems,
    cutItems,
    pasteItems,
    deleteItems,
    startRename,
    confirmRename,
    cancelRename: () => setRenamingId(null),
    getItemName,
    buildFullPath,
    createFolder,
    renamedItems: {},
    showHidden,
    setShowHidden,
    showExtensions,
    setShowExtensions,
    refresh: () => loadDirectory(currentPath, true),
    openItem,
  };
}
