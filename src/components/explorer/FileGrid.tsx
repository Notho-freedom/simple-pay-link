import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FileItem, ViewMode, SortField } from '@/types/fileExplorer';
import { FileIcon } from './FileIcon';
import { formatFileSize } from '@/data/mockFileSystem';
import { useI18n } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useMarqueeSelection } from '@/hooks/useMarqueeSelection';
import { EXPLORER_DND_MIME } from '@/hooks/useDragDrop';
import { useSound } from '@/hooks/useSound';

interface Props {
  files: FileItem[];
  viewMode: ViewMode;
  selectedItems: string[];
  clipboardItems: string[];
  showExtensions: boolean;
  iconSize: number;
  renamingId: string | null;
  renamedItems: Record<string, string>;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onSelect: (id: string, mode: 'single' | 'ctrl' | 'shift') => void;
  onOpen: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onClearSelection: () => void;
  onConfirmRename: (id: string, name: string) => void;
  onCancelRename: () => void;
  onSort: (field: SortField) => void;
  onDropOnFolder?: (folderId: string, draggedIds: string[], copy: boolean) => void;
}

const formatDate = (d: Date, locale: string) => d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function InlineRename({ defaultName, onConfirm, onCancel }: { defaultName: string; onConfirm: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={() => onConfirm(value)}
      onKeyDown={e => { if (e.key === 'Enter') onConfirm(value); if (e.key === 'Escape') onCancel(); }}
      className="bg-[hsl(var(--muted))] border border-primary/30 rounded px-1 py-0 text-[12px] w-full outline-none text-foreground font-light"
      onClick={e => e.stopPropagation()}
    />
  );
}

function getSelectMode(e: React.MouseEvent): 'single' | 'ctrl' | 'shift' {
  if (e.shiftKey) return 'shift';
  if (e.ctrlKey || e.metaKey) return 'ctrl';
  return 'single';
}

// Hide extension if showExtensions=false
function displayLabel(name: string, ext: string | undefined, isFolder: boolean, showExtensions: boolean) {
  if (isFolder || showExtensions || !ext) return name;
  const lower = `.${ext.toLowerCase()}`;
  if (name.toLowerCase().endsWith(lower)) return name.slice(0, -lower.length);
  return name;
}

export function FileGrid({ files, viewMode, selectedItems, clipboardItems, showExtensions, iconSize, renamingId, renamedItems, sortField, sortDirection, onSelect, onOpen, onContextMenu, onClearSelection, onConfirmRename, onCancelRename, onSort, onDropOnFolder }: Props) {
  const { t, locale } = useI18n();
  const { playHover } = useSound();
  const getName = (f: FileItem) => renamedItems[f.id] || f.name;
  const getIconPath = (f: FileItem) => (f as FileItem & { systemPath?: string }).systemPath || f.path;
  const getDisplay = (f: FileItem) => displayLabel(getName(f), f.extension, f.type === 'folder', showExtensions);
  const selectedSet = useMemo(() => new Set(selectedItems), [selectedItems]);
  const clipboardSet = useMemo(() => new Set(clipboardItems), [clipboardItems]);
  const isCut = (id: string) => clipboardSet.has(id);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Build drag/drop handlers per item
  const dragProps = (file: FileItem) => ({
    draggable: !renamingId,
    onDragStart: (e: React.DragEvent) => {
      const dataTransfer = e.dataTransfer;
      if (!dataTransfer) return;
      const ids = selectedSet.has(file.id) && selectedItems.length > 0 ? selectedItems : [file.id];
      e.stopPropagation();
      dataTransfer.effectAllowed = 'copyMove';
      dataTransfer.setData(EXPLORER_DND_MIME, JSON.stringify(ids));
    },
    onDragEnd: () => setDropTarget(null),
    ...(file.type === 'folder' && {
      onDragEnter: (e: React.DragEvent) => {
        const dataTransfer = e.dataTransfer;
        if (!dataTransfer) return;
        const types = Array.from(dataTransfer.types || []);
        if (!types.includes(EXPLORER_DND_MIME)) return;
        e.preventDefault();
        e.stopPropagation();
        if (dropTarget !== file.id) setDropTarget(file.id);
      },
      onDragOver: (e: React.DragEvent) => {
        const dataTransfer = e.dataTransfer;
        if (!dataTransfer) return;
        const types = Array.from(dataTransfer.types || []);
        if (!types.includes(EXPLORER_DND_MIME)) return;
        e.preventDefault();
        e.stopPropagation();
        dataTransfer.dropEffect = e.ctrlKey || e.metaKey ? 'copy' : 'move';
        if (dropTarget !== file.id) setDropTarget(file.id);
      },
      onDragLeave: (e: React.DragEvent) => {
        e.stopPropagation();
        setDropTarget(t => (t === file.id ? null : t));
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDropTarget(null);
        const dataTransfer = e.dataTransfer;
        if (!dataTransfer) return;
        const raw = dataTransfer.getData(EXPLORER_DND_MIME);
        if (!raw) return;
        try {
          const ids = JSON.parse(raw) as string[];
          const filtered = ids.filter(id => id !== file.id);
          if (filtered.length && onDropOnFolder) onDropOnFolder(file.id, filtered, e.ctrlKey || e.metaKey);
        } catch {
          // Ignore malformed drag payloads from outside the explorer.
        }
      },
    }),
  });
  const dropClass = (id: string) => (dropTarget === id ? 'ring-2 ring-primary/60 bg-primary/10' : '');

  const containerRef = useRef<HTMLDivElement>(null);
  const handleMarqueeSelection = useCallback((ids: string[]) => {
    // Replace selection with marquee result (additive merge handled by holding Ctrl before drag = additive flag,
    // but we keep the simpler "exact set" model which matches Windows behaviour).
    if (ids.length === 0) return;
    ids.forEach((id, i) => onSelect(id, i === 0 ? 'single' : 'ctrl'));
  }, [onSelect]);
  const marqueeEnabled = viewMode !== 'details';
  const marqueeRect = useMarqueeSelection({
    containerRef,
    itemSelector: '[data-file-id]',
    enabled: marqueeEnabled,
    onSelectionChange: handleMarqueeSelection,
    onClear: onClearSelection,
  });

  const MarqueeOverlay = marqueeRect ? (
    <div
      className="absolute pointer-events-none border border-primary/50 bg-primary/10 rounded-sm z-20"
      style={{ left: marqueeRect.left, top: marqueeRect.top, width: marqueeRect.width, height: marqueeRect.height }}
    />
  ) : null;

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground" onClick={onClearSelection}>
        <p className="text-sm font-light">{t('empty.folder')}</p>
      </div>
    );
  }

  // ── Details ──
  if (viewMode === 'details') {
    const SortHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
      <th
        onClick={() => onSort(field)}
        className={cn('text-left px-3 py-1.5 font-normal cursor-pointer hover:text-foreground transition-colors select-none', className)}
      >
        <span className="flex items-center gap-1">
          {label}
          {sortField === field && (sortDirection === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
        </span>
      </th>
    );

    return (
      <div className="flex-1 overflow-auto" onClick={e => { if (e.target === e.currentTarget) onClearSelection(); }}>
        <table className="w-full text-[12px] font-light">
          <thead className="sticky top-0 bg-[hsl(var(--explorer-surface))] z-10 border-b border-border/50">
            <tr className="text-muted-foreground text-[11px]">
              <SortHeader field="name" label={t('sort.name')} />
              <SortHeader field="dateModified" label={t('sort.dateModified')} />
              <SortHeader field="type" label={t('sort.type')} />
              <SortHeader field="size" label={t('sort.size')} className="text-right" />
            </tr>
          </thead>
          <tbody>
            {files.map(file => {
              const selected = selectedSet.has(file.id);
              const isRenaming = renamingId === file.id;
              return (
                <tr
                  key={file.id}
                  onClick={e => onSelect(file.id, getSelectMode(e))}
                  onDoubleClick={() => onOpen(file.id)}
                  onContextMenu={e => onContextMenu(e, file.id)}
                  onMouseEnter={playHover}
                  {...dragProps(file)}
                  className={cn('cursor-default transition-colors h-7', selected ? 'item-selected-focus' : 'hover:bg-[hsl(var(--explorer-hover))]', isCut(file.id) && 'item-cut', dropClass(file.id))}
                >
                  <td className="px-3 py-0.5">
                    <div className="flex items-center gap-2">
                      <FileIcon type={file.type} extension={file.extension} name={getName(file)} path={getIconPath(file)} size={16} />
                      {isRenaming ? (
                        <InlineRename defaultName={getName(file)} onConfirm={n => onConfirmRename(file.id, n)} onCancel={onCancelRename} />
                      ) : (
                        <span className="truncate">{getDisplay(file)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-0.5 text-muted-foreground">{formatDate(file.dateModified, locale)}</td>
                  <td className="px-3 py-0.5 text-muted-foreground">{t(`filetype.${file.type}`)}</td>
                  <td className="px-3 py-0.5 text-right text-muted-foreground font-mono text-[11px]">{file.type === 'folder' ? '' : formatFileSize(file.size)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ── List ──
  if (viewMode === 'list') {
    return (
      <div ref={containerRef} className="flex-1 overflow-auto p-1 relative" onClick={e => { if (e.target === e.currentTarget) onClearSelection(); }}>
        <div className="flex flex-wrap content-start">
          {files.map(file => {
            const selected = selectedSet.has(file.id);
            const isRenaming = renamingId === file.id;
            return (
              <div
                key={file.id}
                data-file-id={file.id}
                onClick={e => { e.stopPropagation(); onSelect(file.id, getSelectMode(e)); }}
                onDoubleClick={() => onOpen(file.id)}
                onContextMenu={e => onContextMenu(e, file.id)}
                onMouseEnter={playHover}
                {...dragProps(file)}
                className={cn('flex items-center gap-1.5 px-2 py-[3px] text-[12px] font-light cursor-default transition-colors rounded-sm w-56', selected ? 'item-selected-focus' : 'hover:bg-[hsl(var(--explorer-hover))]', isCut(file.id) && 'item-cut', dropClass(file.id))}
              >
                <FileIcon type={file.type} extension={file.extension} name={getName(file)} path={getIconPath(file)} size={16} />
                {isRenaming ? (
                  <InlineRename defaultName={getName(file)} onConfirm={n => onConfirmRename(file.id, n)} onCancel={onCancelRename} />
                ) : (
                  <span className="truncate">{getDisplay(file)}</span>
                )}
              </div>
            );
          })}
        </div>
        {MarqueeOverlay}
      </div>
    );
  }

  // ── Tiles ──
  if (viewMode === 'tiles') {
    return (
      <div ref={containerRef} className="flex-1 overflow-auto p-3 relative" onClick={e => { if (e.target === e.currentTarget) onClearSelection(); }}>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {files.map(file => {
            const selected = selectedSet.has(file.id);
            const isRenaming = renamingId === file.id;
            return (
              <div
                key={file.id}
                data-file-id={file.id}
                onClick={e => { e.stopPropagation(); onSelect(file.id, getSelectMode(e)); }}
                onDoubleClick={() => onOpen(file.id)}
                onContextMenu={e => onContextMenu(e, file.id)}
                onMouseEnter={playHover}
                {...dragProps(file)}
                className={cn('flex items-center gap-3 px-3 py-2 rounded cursor-default transition-colors', selected ? 'item-selected-focus' : 'hover:bg-[hsl(var(--explorer-hover))]', isCut(file.id) && 'item-cut', dropClass(file.id))}
              >
                {file.thumbnail ? (
                  <img src={file.thumbnail} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                ) : (
                  <FileIcon type={file.type} extension={file.extension} name={getName(file)} path={getIconPath(file)} size={36} />
                )}
                <div className="min-w-0 flex-1">
                  {isRenaming ? (
                    <InlineRename defaultName={getName(file)} onConfirm={n => onConfirmRename(file.id, n)} onCancel={onCancelRename} />
                  ) : (
                    <p className="text-[12px] truncate font-light">{getDisplay(file)}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">{t(`filetype.${file.type}`)}</p>
                  {file.size !== undefined && file.type !== 'folder' && (
                    <p className="text-[10px] text-muted-foreground font-mono">{formatFileSize(file.size)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {MarqueeOverlay}
      </div>
    );
  }

  // ── Content ──
  if (viewMode === 'content') {
    return (
      <div ref={containerRef} className="flex-1 overflow-auto p-3 relative" onClick={e => { if (e.target === e.currentTarget) onClearSelection(); }}>
        <div className="space-y-px">
          {files.map(file => {
            const selected = selectedSet.has(file.id);
            const isRenaming = renamingId === file.id;
            return (
              <div
                key={file.id}
                data-file-id={file.id}
                onClick={e => { e.stopPropagation(); onSelect(file.id, getSelectMode(e)); }}
                onDoubleClick={() => onOpen(file.id)}
                onContextMenu={e => onContextMenu(e, file.id)}
                onMouseEnter={playHover}
                {...dragProps(file)}
                className={cn('flex items-center gap-4 px-3 py-2.5 rounded cursor-default transition-colors', selected ? 'item-selected-focus' : 'hover:bg-[hsl(var(--explorer-hover))]', isCut(file.id) && 'item-cut', dropClass(file.id))}
              >
                {file.thumbnail ? (
                  <img src={file.thumbnail} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                ) : (
                  <FileIcon type={file.type} extension={file.extension} name={getName(file)} path={getIconPath(file)} size={40} />
                )}
                <div className="flex-1 min-w-0">
                  {isRenaming ? (
                    <InlineRename defaultName={getName(file)} onConfirm={n => onConfirmRename(file.id, n)} onCancel={onCancelRename} />
                  ) : (
                    <p className="text-[13px] truncate font-light">{getDisplay(file)}</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                    <span>{t(`filetype.${file.type}`)}</span>
                    <span>{formatDate(file.dateModified, locale)}</span>
                    {file.size !== undefined && file.type !== 'folder' && <span className="font-mono">{formatFileSize(file.size)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {MarqueeOverlay}
      </div>
    );
  }

  // ── Grid ──
  const sizeMap: Record<string, { icon: number; cell: string; text: string; gap: string }> = {
    'grid-large': { icon: 56, cell: 'w-28 p-2', text: 'text-[12px]', gap: 'gap-1' },
    'grid-medium': { icon: 40, cell: 'w-24 p-2', text: 'text-[11px]', gap: 'gap-1' },
    'grid-small': { icon: 20, cell: 'w-20 p-1.5', text: 'text-[10px]', gap: 'gap-0.5' },
  };
  const config = sizeMap[viewMode] || sizeMap['grid-medium'];

  return (
    <div ref={containerRef} className="flex-1 overflow-auto p-3 relative" onClick={e => { if (e.target === e.currentTarget) onClearSelection(); }}>
      <div className={cn('flex flex-wrap content-start', config.gap)} style={{ '--icon-scale': 'var(--icon-scale, 1)' } as React.CSSProperties & { '--icon-scale': string }}>
        {files.map(file => {
          const selected = selectedSet.has(file.id);
          const isRenaming = renamingId === file.id;
          const showThumb = file.thumbnail && viewMode !== 'grid-small';
          const scaledIcon = `calc(${config.icon}px * var(--icon-scale, 1))`;
          return (
            <div
              key={file.id}
              data-file-id={file.id}
              onClick={e => { e.stopPropagation(); onSelect(file.id, getSelectMode(e)); }}
              onDoubleClick={() => onOpen(file.id)}
              onContextMenu={e => onContextMenu(e, file.id)}
              onMouseEnter={playHover}
              {...dragProps(file)}
              className={cn('flex flex-col items-center justify-center rounded cursor-default transition-colors', config.cell, selected ? 'item-selected-focus' : 'hover:bg-[hsl(var(--explorer-hover))]', isCut(file.id) && 'item-cut', dropClass(file.id))}
              style={{ width: `calc(${config.cell.match(/w-(\d+)/)?.[1] || '24'} * 0.25rem * var(--icon-scale, 1))` }}
            >
              {showThumb ? (
                <img src={file.thumbnail} alt="" className="rounded object-cover" style={{ width: scaledIcon, height: scaledIcon }} />
              ) : (
                <div style={{ width: scaledIcon, height: scaledIcon, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileIcon type={file.type} extension={file.extension} name={getName(file)} path={getIconPath(file)} size={config.icon} />
                </div>
              )}
              {isRenaming ? (
                <div className="w-full mt-1">
                  <InlineRename defaultName={getName(file)} onConfirm={n => onConfirmRename(file.id, n)} onCancel={onCancelRename} />
                </div>
              ) : (
                <p className={cn('text-center line-clamp-2 w-full mt-1 font-light', config.text)}>{getDisplay(file)}</p>
              )}
            </div>
          );
        })}
      </div>
      {MarqueeOverlay}
    </div>
  );
}
