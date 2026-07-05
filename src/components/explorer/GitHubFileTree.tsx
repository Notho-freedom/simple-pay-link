import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Loader2 } from 'lucide-react';
import { HDIcon } from './icons/HDIcon';
import { resolveIconUrl } from './icons/iconRegistry';
import { cn } from '@/lib/utils';

export interface TreeItem {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  size?: number;
  sha?: string;
  download_url?: string | null;
}

interface Props {
  rootItems: TreeItem[];
  loading?: boolean;
  activePath?: string | null;
  loadChildren: (path: string) => Promise<TreeItem[]>;
  onOpenFile: (item: TreeItem) => void;
  onContextMenu?: (e: React.MouseEvent, item: TreeItem, action?: () => void) => void;
}

/** VS Code-style file explorer tree with lazy loading. */
export function GitHubFileTree({ rootItems, loading, activePath, loadChildren, onOpenFile, onContextMenu }: Props) {
  return (
    <div className="text-[12px] py-1 select-none">
      {loading && rootItems.length === 0 ? (
        <div className="p-3 text-[11.5px] text-muted-foreground flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" /> Chargement…
        </div>
      ) : (
        <TreeList items={rootItems} depth={0} activePath={activePath} loadChildren={loadChildren} onOpenFile={onOpenFile} onContextMenu={onContextMenu} />
      )}
    </div>
  );
}

function sortItems(items: TreeItem[]) {
  return [...items].sort((a, b) => {
    if (a.type === 'dir' && b.type !== 'dir') return -1;
    if (a.type !== 'dir' && b.type === 'dir') return 1;
    return a.name.localeCompare(b.name);
  });
}

function TreeList({ items, depth, activePath, loadChildren, onOpenFile, onContextMenu }: {
  items: TreeItem[]; depth: number; activePath?: string | null;
  loadChildren: (path: string) => Promise<TreeItem[]>;
  onOpenFile: (item: TreeItem) => void;
  onContextMenu?: (e: React.MouseEvent, item: TreeItem, action?: () => void) => void;
}) {
  const sorted = sortItems(items);
  return (
    <>
      {sorted.map((it) => (
        it.type === 'dir'
          ? <TreeDir key={it.path} item={it} depth={depth} activePath={activePath} loadChildren={loadChildren} onOpenFile={onOpenFile} onContextMenu={onContextMenu} />
          : <TreeFile key={it.path} item={it} depth={depth} activePath={activePath} onOpenFile={onOpenFile} onContextMenu={onContextMenu} />
      ))}
    </>
  );
}

function TreeDir({ item, depth, activePath, loadChildren, onOpenFile, onContextMenu }: {
  item: TreeItem; depth: number; activePath?: string | null;
  loadChildren: (path: string) => Promise<TreeItem[]>;
  onOpenFile: (item: TreeItem) => void;
  onContextMenu?: (e: React.MouseEvent, item: TreeItem, action?: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [kids, setKids] = useState<TreeItem[] | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(async () => {
    if (!open && !kids) {
      setBusy(true);
      try { setKids(await loadChildren(item.path)); } catch { setKids([]); }
      setBusy(false);
    }
    setOpen((v) => !v);
  }, [open, kids, item.path, loadChildren]);

  // Auto-open if active path is inside this dir
  useEffect(() => {
    if (activePath && activePath.startsWith(item.path + '/') && !open) void toggle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath]);

  return (
    <div>
      <button
        onClick={toggle}
        onContextMenu={(e) => onContextMenu?.(e, item, toggle)}
        className={cn(
          'group w-full flex items-center gap-1 py-[3px] text-left hover:bg-[hsl(var(--explorer-hover))] pr-2',
        )}
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        <span className="w-[12px] shrink-0 flex items-center justify-center text-muted-foreground/70">
          {busy ? <Loader2 size={10} className="animate-spin" /> : open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
        {open
          ? <FolderOpen size={13} className="text-sky-400 shrink-0" />
          : <Folder size={13} className="text-sky-400 shrink-0" />}
        <span className="truncate flex-1 text-[11.5px]">{item.name}</span>
      </button>
      {open && kids && (
        <TreeList items={kids} depth={depth + 1} activePath={activePath} loadChildren={loadChildren} onOpenFile={onOpenFile} onContextMenu={onContextMenu} />
      )}
    </div>
  );
}

function TreeFile({ item, depth, activePath, onOpenFile, onContextMenu }: {
  item: TreeItem; depth: number; activePath?: string | null;
  onOpenFile: (item: TreeItem) => void;
  onContextMenu?: (e: React.MouseEvent, item: TreeItem) => void;
}) {
  const active = activePath === item.path;
  const ext = item.name.includes('.') ? item.name.split('.').pop() : undefined;
  const iconUrl = resolveIconUrl({ type: ext ? 'code' : 'text', extension: ext, name: item.name });
  return (
    <button
      onClick={() => onOpenFile(item)}
      onContextMenu={(e) => onContextMenu?.(e, item)}
      className={cn(
        'w-full flex items-center gap-1 py-[3px] pr-2 text-left hover:bg-[hsl(var(--explorer-hover))]',
        active && 'bg-[hsl(var(--explorer-selected))] text-foreground',
      )}
      style={{ paddingLeft: 4 + depth * 12 + 12 /* align past chevron */ }}
    >
      <HDIcon src={iconUrl} size={13} alt="" fallbackEmoji="📄" />
      <span className="truncate flex-1 text-[11.5px]">{item.name}</span>
    </button>
  );
}
