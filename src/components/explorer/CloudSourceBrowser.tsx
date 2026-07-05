import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck, WifiOff } from 'lucide-react';
import { FileGrid } from './FileGrid';
import { Button } from '@/components/ui/button';
import { explorerToast } from './ExplorerToasts';
import { useExplorerSources } from '@/hooks/useExplorerSources';
import type { ExplorerSource } from '@/types/explorerSources';
import type { FileItem, FileType, SortField, ViewMode } from '@/types/fileExplorer';
import { openContextMenu } from '@/lib/contextMenuBus';
import { api, apiUrl } from '@/lib/apiClient';

interface Props {
  source: ExplorerSource;
  initialPath?: string;
  viewMode: ViewMode;
  searchQuery: string;
  showExtensions: boolean;
  iconSize: number;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  refreshSignal?: number;
  testSignal?: number;
  onBack: () => void;
  onPathChange?: (path: string) => void;
  onActiveFileChange?: (file: FileItem | null) => void;
  onPreviewRequest?: () => void;
}

function parentPath(path: string) {
  if (!path || path === '/') return '/';
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? `/${parts.join('/')}` : '/';
}

function joinSourcePath(base: string, name: string) {
  if (!base || base === '/') return `/${name}`;
  return `${base.replace(/\/$/, '')}/${name}`;
}

function extensionOf(name: string) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : undefined;
}

function sourceRelativePath(itemPath: string, source: ExplorerSource) {
  if (source.type !== 'local' || !source.root) return itemPath;
  const full = String(itemPath || '').replace(/\\/g, '/');
  const root = String(source.root).replace(/\\/g, '/').replace(/\/+$/, '');
  if (!root || !full.toLowerCase().startsWith(root.toLowerCase())) return itemPath;
  const relative = full.slice(root.length).replace(/^\/+/, '');
  return relative ? `/${relative}` : '/';
}

type SourceApiItem = Partial<Omit<FileItem, 'dateCreated' | 'dateModified' | 'type'>> & {
  isDirectory?: boolean;
  isFile?: boolean;
  modified?: string | number | Date | null;
  dateModified?: string | number | Date | null;
  dateCreated?: string | number | Date | null;
  type?: FileType | string;
};

export type PreviewableFileItem = FileItem & { previewUrl?: string; systemPath?: string };

function normalizeApiItem(item: SourceApiItem, source: ExplorerSource): PreviewableFileItem {
  const isDirectory = Boolean(item.isDirectory) || item.type === 'folder';
  const name = item.name || String(item.path || '').split(/[\\/]/).pop() || 'item';
  const itemPath = sourceRelativePath(item.path || name, source);
  const modified = item.dateModified || item.modified || new Date();
  const file: PreviewableFileItem = {
    id: item.id || `${source.id}:${itemPath}`,
    name,
    path: itemPath,
    targetPath: itemPath,
    type: isDirectory ? 'folder' : ((item.type || 'unknown') as FileType),
    extension: isDirectory ? undefined : extensionOf(name),
    size: item.size || 0,
    dateModified: new Date(modified),
    dateCreated: new Date(item.dateCreated || modified),
    parentId: null,
    children: isDirectory ? [] : undefined,
    isReadOnly: Boolean(item.isReadOnly),
    systemPath: source.type === 'local' || source.type === 'network' ? String(item.path || '') : undefined,
  };
  if (!isDirectory && source.type !== 'ftp' && ['image', 'video', 'audio', 'pdf', 'text', 'code'].includes(file.type)) {
    file.previewUrl = apiUrl(`/api/sources/${encodeURIComponent(source.id)}/raw?path=${encodeURIComponent(itemPath)}`);
    if (file.type === 'image') file.thumbnail = file.previewUrl;
  }
  return file;
}

function sortValue(file: FileItem, field: SortField) {
  if (field === 'size') return file.type === 'folder' ? -1 : (file.size || 0);
  if (field === 'type') return file.type;
  if (field === 'dateCreated') return file.dateCreated.getTime();
  if (field === 'dateModified') return file.dateModified.getTime();
  return file.name.toLowerCase();
}

function compareFiles(a: FileItem, b: FileItem, field: SortField, direction: 'asc' | 'desc') {
  if (a.type === 'folder' && b.type !== 'folder') return -1;
  if (a.type !== 'folder' && b.type === 'folder') return 1;
  const av = sortValue(a, field);
  const bv = sortValue(b, field);
  const result = typeof av === 'number' && typeof bv === 'number'
    ? av - bv
    : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}

export function CloudSourceBrowser({
  source,
  initialPath = '/',
  viewMode,
  searchQuery,
  showExtensions,
  iconSize,
  sortField,
  sortDirection,
  onSort,
  refreshSignal = 0,
  testSignal = 0,
  onBack,
  onPathChange,
  onActiveFileChange,
  onPreviewRequest,
}: Props) {
  const { list, test } = useExplorerSources();
  const [path, setPath] = useState(initialPath);
  const [items, setItems] = useState<FileItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPath: string, opts: { force?: boolean } = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await list(source.id, nextPath, opts);
      setItems((result.items || []).map((item) => normalizeApiItem(item, source)));
      const resolvedPath = result.path || nextPath;
      setPath(resolvedPath);
      onPathChange?.(resolvedPath);
      setSelectedItems([]);
      onActiveFileChange?.(null);
      if (!result.success) setError(result.error || 'Source unavailable');
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : 'Source unavailable');
    } finally {
      setIsLoading(false);
    }
  }, [list, onActiveFileChange, onPathChange, source]);

  useEffect(() => {
    void load(initialPath || '/');
  }, [initialPath, load]);

  useEffect(() => {
    if (refreshSignal === 0) return;
    void load(path, { force: true });
  }, [load, path, refreshSignal]);

  const selected = useMemo(() => new Set(selectedItems), [selectedItems]);
  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items
      .filter((item) => !q || item.name.toLowerCase().includes(q))
      .sort((a, b) => compareFiles(a, b, sortField, sortDirection));
  }, [items, searchQuery, sortDirection, sortField]);

  const openItem = useCallback((id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    if (item.type === 'folder') void load(item.path || joinSourcePath(path, item.name));
    else if (['image', 'video', 'audio'].includes(item.type)) {
      setSelectedItems([id]);
      onActiveFileChange?.(item);
      onPreviewRequest?.();
    }
  }, [items, load, onActiveFileChange, onPreviewRequest, path]);

  const testConnection = useCallback(async () => {
    try {
      const result = await test(source.id);
      if (result.success) explorerToast.success('Connexion réussie', source.name);
      else explorerToast.error('Connexion impossible', result.error || source.name);
    } catch (err) {
      explorerToast.error('Connexion impossible', err instanceof Error ? err.message : source.name);
    }
  }, [test, source.id, source.name]);

  const sourceAction = useCallback(async (actionId: string, file: PreviewableFileItem | null) => {
    if (!file) return;
    const systemPath = file.systemPath || file.path;
    if (!systemPath) return;
    if (actionId === 'open') {
      if (file.type === 'folder') void load(file.path || '/');
      else await api.post('/api/fs/open', { path: systemPath });
      return;
    }
    if (actionId === 'delete') {
      const result = await api.post<{ success: boolean; error?: string }>('/api/fs/delete', { path: systemPath });
      if (result.success) {
        explorerToast.success('Supprimé', file.name);
        void load(path, { force: true });
      } else {
        explorerToast.error('Suppression impossible', result.error || file.name);
      }
      return;
    }
    if (actionId === 'copy.path') {
      await navigator.clipboard?.writeText(systemPath);
      explorerToast.success('Chemin copié');
    }
  }, [load, path]);

  useEffect(() => {
    if (testSignal === 0) return;
    void testConnection();
  }, [testConnection, testSignal]);

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background">
      {path !== '/' && (
        <button
          type="button"
          onClick={() => void load(parentPath(path), { force: true })}
          className="h-9 px-4 border-b border-border/30 text-left text-[12px] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] shrink-0"
        >
          .. remonter
        </button>
      )}

      {isLoading && items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm gap-2">
          <Loader2 size={16} className="animate-spin" />
          Chargement de la source...
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <WifiOff size={30} className="text-red-300" />
          <div>
            <div className="text-sm text-red-200">Source indisponible</div>
            <div className="text-xs text-muted-foreground mt-1 max-w-lg">{error}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void load(path)}>Réessayer</Button>
        </div>
      ) : (
        <FileGrid
          files={visibleItems}
          viewMode={viewMode}
          selectedItems={selectedItems}
          clipboardItems={[]}
          showExtensions={showExtensions}
          iconSize={iconSize}
          renamingId={null}
          renamedItems={{}}
          sortField={sortField}
          sortDirection={sortDirection}
          onSelect={(id, mode = 'single') => {
            if (mode === 'ctrl') {
              setSelectedItems((current) => {
                const next = selected.has(id) ? current.filter((item) => item !== id) : [...current, id];
                onActiveFileChange?.(next.length === 1 ? visibleItems.find((item) => item.id === next[0]) || null : null);
                return next;
              });
              return;
            }
            setSelectedItems([id]);
            const file = visibleItems.find((item) => item.id === id) || null;
            onActiveFileChange?.(file);
            if (file && ['image', 'video', 'audio'].includes(file.type)) onPreviewRequest?.();
          }}
          onOpen={openItem}
          onContextMenu={(e, id) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedItems([id]);
            const file = visibleItems.find((item) => item.id === id) || null;
            openContextMenu(e, {
              isBackground: false,
              file,
              hasClipboard: false,
              selectedCount: 1,
              targetId: id,
            }, (actionId) => void sourceAction(actionId, file as PreviewableFileItem | null));
          }}
          onClearSelection={() => { setSelectedItems([]); onActiveFileChange?.(null); }}
          onConfirmRename={() => {}}
          onCancelRename={() => {}}
          onSort={onSort}
          onDropOnFolder={() => {}}
        />
      )}

      <div className="h-7 border-t border-border/40 px-3 flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
        <ShieldCheck size={12} className="text-emerald-400" />
        Lecture seule · {visibleItems.length} élément(s)
      </div>
    </div>
  );
}
