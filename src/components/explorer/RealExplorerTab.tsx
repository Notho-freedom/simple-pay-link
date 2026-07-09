import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plug } from 'lucide-react';
import { useRealFileExplorer, REAL_VIRTUAL_PATHS } from '@/hooks/useRealFileExplorer';
import { RealExplorerSidebar } from './RealExplorerSidebar';
import { Toolbar } from './Toolbar';
import { FileGrid } from './FileGrid';
import { PreviewPanel } from './PreviewPanel';
import { StatusBar } from './StatusBar';
import { RealDriveOverview } from './RealDriveOverview';
import { ExplorerContextMenu } from './ExplorerContextMenu';
import { PropertiesDialog } from './PropertiesDialog';
import { MobileDeviceView } from './MobileDeviceView';
import { GitHubPanel } from './GitHubPanel';
import { CopyProgressBar } from './CopyProgressBar';
import { CopyDetailDialog } from './CopyDetailDialog';
import { TerminalPanel } from './TerminalPanel';
import { NewConnectionDialog } from './NewConnectionDialog';
import { LoadingShimmer } from './LoadingShimmer';
import { useFileOperations } from '@/hooks/useFileOperations';
import { useSound } from '@/hooks/useSound';
import { explorerToast } from './ExplorerToasts';
import { fileSystem } from '@/data/mockFileSystem';
import type { FileItem } from '@/types/fileExplorer';

interface Props {
  active: boolean;
  initialPath?: string;
  openToken?: number;
  onPathChange: (path: string) => void;
  onOpenCommandPalette: () => void;
}

function getSelectMode(e: React.MouseEvent): 'single' | 'ctrl' | 'shift' {
  if (e.shiftKey) return 'shift';
  if (e.ctrlKey || e.metaKey) return 'ctrl';
  return 'single';
}

export function RealExplorerTab({ active, initialPath, openToken = 0, onPathChange, onOpenCommandPalette }: Props) {
  const explorer = useRealFileExplorer(initialPath);
  const { play } = useSound();
  const ops = useFileOperations();
  const lastEmittedPathRef = useRef<string | null>(null);
  const lastOpenTokenRef = useRef(0);
  const [ctxMenu, setCtxMenu] = useState<{ visible: boolean; x: number; y: number; item: FileItem | null }>({ visible: false, x: 0, y: 0, item: null });
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [propertiesId, setPropertiesId] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [newConnOpen, setNewConnOpen] = useState(false);

  useEffect(() => {
    const current = explorer.nav.currentFolderId;
    if (lastEmittedPathRef.current === current) return;
    lastEmittedPathRef.current = current;
    onPathChange(current);
  }, [explorer.nav.currentFolderId, onPathChange]);
  useEffect(() => {
    if (!initialPath || openToken <= 0 || lastOpenTokenRef.current === openToken) return;
    lastOpenTokenRef.current = openToken;
    if (explorer.nav.currentFolderId !== initialPath) explorer.navigateTo(initialPath);
  }, [explorer.nav.currentFolderId, explorer.navigateTo, initialPath, openToken]);

  const selectedFile = useMemo(() => {
    if (explorer.nav.selectedItems.length !== 1) return null;
    const id = explorer.nav.selectedItems[0];
    return explorer.currentChildren.find((file) => file.id === id) || explorer.files.find((file) => file.id === id) || fileSystem[id] || null;
  }, [explorer.currentChildren, explorer.files, explorer.nav.selectedItems]);

  const handleOpen = useCallback((id: string) => {
    play('open');
    void explorer.openItem(id);
  }, [explorer, play]);

  const handleNavigatePath = useCallback((index: number) => {
    const current = explorer.nav.currentFolderId;
    if (current.startsWith('virtual:')) return;
    const parts = current.replace(/[\\/]+$/, '').split(/[\\/]/).filter(Boolean);
    if (index < 0 || index >= parts.length) return;
    if (/^[A-Za-z]:$/.test(parts[0])) {
      explorer.navigateTo(index === 0 ? `${parts[0]}\\` : `${parts.slice(0, index + 1).join('\\')}`);
      return;
    }
    explorer.navigateTo(parts.slice(0, index + 1).join('/'));
  }, [explorer]);

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    explorer.selectItem(id);
    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, item: explorer.currentChildren.find((file) => file.id === id) || null });
  }, [explorer]);

  const handleBackgroundContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    explorer.clearSelection();
    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, item: null });
  }, [explorer]);

  const copySelected = useCallback(() => {
    explorer.copyItems(explorer.nav.selectedItems);
    explorerToast.success('Copie preparee', `${explorer.nav.selectedItems.length} element(s)`);
  }, [explorer]);

  const cutSelected = useCallback(() => {
    explorer.cutItems(explorer.nav.selectedItems);
    explorerToast.info('Deplacement prepare', `${explorer.nav.selectedItems.length} element(s)`);
  }, [explorer]);

  const pasteSelected = useCallback(async () => {
    const count = await explorer.pasteItems();
    if (count > 0) explorerToast.success('Operation terminee', `${count} element(s) traite(s)`);
  }, [explorer]);

  const deleteSelected = useCallback(() => {
    void explorer.deleteItems(explorer.nav.selectedItems);
  }, [explorer]);

  const handleCtxAction = useCallback((actionId: string) => {
    const id = ctxMenu.item?.id;
    switch (actionId) {
      case 'open': if (id) handleOpen(id); break;
      case 'preview': if (id) { explorer.selectItem(id); explorer.openPreview(); } break;
      case 'cut': id ? explorer.cutItems([id]) : cutSelected(); break;
      case 'copy': id ? explorer.copyItems([id]) : copySelected(); break;
      case 'paste': void pasteSelected(); break;
      case 'rename': if (id) explorer.startRename(id); break;
      case 'delete': id ? void explorer.deleteItems([id]) : deleteSelected(); break;
      case 'properties': setPropertiesId(id || explorer.nav.currentFolderId); setPropertiesOpen(true); break;
      case 'copy.path': navigator.clipboard?.writeText(ctxMenu.item?.path || explorer.nav.currentFolderId); explorerToast.success('Chemin copie'); break;
      case 'terminal': setTerminalOpen(true); break;
      case 'refresh': void explorer.refresh(); break;
      case 'new.folder': void explorer.createFolder(); break;
      default: explorerToast.info(`Action demo : ${actionId}`, 'Non destructive');
    }
  }, [copySelected, ctxMenu.item, cutSelected, deleteSelected, explorer, handleOpen, pasteSelected]);

  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.key === 'F2' && explorer.nav.selectedItems.length === 1) { e.preventDefault(); explorer.startRename(explorer.nav.selectedItems[0]); }
      if (e.key === 'Delete' && explorer.nav.selectedItems.length > 0) { e.preventDefault(); deleteSelected(); }
      if (ctrl && e.key.toLowerCase() === 'a') { e.preventDefault(); explorer.selectAll(); }
      if (ctrl && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelected(); }
      if (ctrl && e.key.toLowerCase() === 'x') { e.preventDefault(); cutSelected(); }
      if (ctrl && e.key.toLowerCase() === 'v') { e.preventDefault(); void pasteSelected(); }
      if (e.key === 'Backspace' && explorer.canGoUp) { e.preventDefault(); explorer.goUp(); }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); explorer.goBack(); }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); explorer.goForward(); }
      if (ctrl && (e.key === '`' || e.key === '²')) { e.preventDefault(); setTerminalOpen((value) => !value); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, copySelected, cutSelected, deleteSelected, explorer, pasteSelected]);

  const currentPath = explorer.nav.currentFolderId;
  const showThisPc = currentPath === REAL_VIRTUAL_PATHS.thisPc || currentPath === REAL_VIRTUAL_PATHS.quickAccess;
  const showNetwork = currentPath === REAL_VIRTUAL_PATHS.network;
  const showGithubDemo = currentPath === 'virtual:demo-github';
  const showMobileDemo = currentPath === 'mobile-root';

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background" style={{ ['--icon-scale' as any]: explorer.nav.iconSize / 80 }}>
      <Toolbar
        path={explorer.nav.currentPath}
        viewMode={explorer.nav.viewMode}
        searchQuery={explorer.nav.searchQuery}
        showPreview={explorer.nav.showPreview}
        showHidden={explorer.showHidden}
        showExtensions={explorer.showExtensions}
        canGoBack={explorer.canGoBack}
        canGoForward={explorer.canGoForward}
        canGoUp={explorer.canGoUp}
        selectedCount={explorer.nav.selectedItems.length}
        hasClipboard={explorer.clipboard.items.length > 0}
        sortField={explorer.nav.sortField}
        sortDirection={explorer.nav.sortDirection}
        onGoBack={explorer.goBack}
        onGoForward={explorer.goForward}
        onGoUp={explorer.goUp}
        onNavigatePath={handleNavigatePath}
        onViewChange={explorer.setViewMode}
        onSearch={explorer.setSearchQuery}
        onTogglePreview={explorer.togglePreview}
        onToggleHidden={() => explorer.setShowHidden(!explorer.showHidden)}
        onToggleExtensions={() => explorer.setShowExtensions(!explorer.showExtensions)}
        onSort={explorer.setSort}
        onCopy={copySelected}
        onCut={cutSelected}
        onPaste={() => void pasteSelected()}
        onDelete={deleteSelected}
        onNewFolder={() => { void explorer.createFolder().then((r) => { if (r && !r.success && r.error && r.error !== 'cancelled') explorerToast.error('Création impossible', r.error); }); }}
        onNewFile={(kind) => { void explorer.createFile(kind as any).then((r) => { if (r && !r.success && r.error && r.error !== 'cancelled') explorerToast.error('Création impossible', r.error); }); }}
        onOpenTerminal={() => setTerminalOpen(true)}
        onRename={() => { if (explorer.nav.selectedItems.length === 1) explorer.startRename(explorer.nav.selectedItems[0]); }}
        onRefresh={() => void explorer.refresh()}
        contextActions={
          <>
            {(showNetwork || showThisPc) && (
              <button
                onClick={() => setNewConnOpen(true)}
                className="h-6 px-2 mr-1 text-[11px] gap-1 rounded flex items-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] font-light"
                title="Nouvelle connexion"
              >
                <Plug size={12} /> Connexion
              </button>
            )}
            {explorer.isLoading && !showThisPc && !showNetwork && (
              <LoadingShimmer className="mr-2" compact />
            )}
          </>
        }
      />


      <div className="flex flex-1 overflow-hidden min-h-0">
        <RealExplorerSidebar currentPath={currentPath} drives={explorer.drives} onNavigate={explorer.navigateTo} />
        <div className="flex-1 flex overflow-hidden min-w-0" onContextMenu={handleBackgroundContextMenu}>
          {showGithubDemo ? (
            <GitHubPanel onNavigate={explorer.navigateTo} />
          ) : showMobileDemo ? (
            <MobileDeviceView onNavigate={explorer.navigateTo} />
          ) : showThisPc ? (
            <RealDriveOverview mode="this-pc" entries={explorer.currentChildren} onNavigate={explorer.navigateTo} />
          ) : showNetwork ? (
            <RealDriveOverview mode="network" entries={explorer.currentChildren} onNavigate={explorer.navigateTo} />

          ) : explorer.isLoading && explorer.currentChildren.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Chargement...</div>
          ) : explorer.error ? (
            <div className="flex-1 flex items-center justify-center text-red-300 text-sm">{explorer.error}</div>
          ) : (
            <FileGrid
              files={explorer.currentChildren}
              viewMode={explorer.nav.viewMode}
              selectedItems={explorer.nav.selectedItems}
              clipboardItems={explorer.clipboard.operation === 'cut' ? explorer.clipboard.items : []}
              showExtensions={explorer.showExtensions}
              iconSize={explorer.nav.iconSize}
              renamingId={explorer.nav.renamingId}
              renamedItems={explorer.renamedItems}
              sortField={explorer.nav.sortField}
              sortDirection={explorer.nav.sortDirection}
              onSelect={explorer.selectItem}
              onOpen={handleOpen}
              onContextMenu={handleContextMenu}
              onClearSelection={explorer.clearSelection}
              onConfirmRename={explorer.confirmRename}
              onCancelRename={explorer.cancelRename}
              onSort={explorer.setSort}
              onDropOnFolder={(folderId, ids) => {
                explorer.copyItems(ids);
                void explorer.pasteItems(folderId);
              }}
            />
          )}

          <AnimatePresence>
            {explorer.nav.showPreview && (
              <PreviewPanel file={selectedFile} displayName={selectedFile ? explorer.getItemName(selectedFile.id) : ''} onClose={explorer.togglePreview} />
            )}
          </AnimatePresence>
        </div>
      </div>

      <TerminalPanel
        open={terminalOpen}
        cwd={currentPath}
        cwdName={currentPath}
        onClose={() => setTerminalOpen(false)}
        onCd={explorer.navigateTo}
        onMkdir={() => void explorer.createFolder()}
      />

      <CopyProgressBar jobs={ops.jobs} onCancel={ops.cancelJob} onTogglePause={ops.togglePause} onOpenDetail={() => ops.setDetailOpen(true)} />
      <StatusBar files={explorer.currentChildren} selectedCount={explorer.nav.selectedItems.length} iconSize={explorer.nav.iconSize} onIconSizeChange={explorer.setIconSize} onOpenCommandPalette={onOpenCommandPalette} />

      <ExplorerContextMenu
        x={ctxMenu.x}
        y={ctxMenu.y}
        visible={ctxMenu.visible}
        ctx={{ isBackground: !ctxMenu.item, file: (ctxMenu.item as any) || null, hasClipboard: explorer.clipboard.items.length > 0, selectedCount: explorer.nav.selectedItems.length, targetId: ctxMenu.item?.id || currentPath }}
        onClose={() => setCtxMenu((value) => ({ ...value, visible: false }))}
        onAction={handleCtxAction}
      />

      <CopyDetailDialog open={ops.detailOpen} onOpenChange={ops.setDetailOpen} jobs={ops.jobs} onCancel={ops.cancelJob} onTogglePause={ops.togglePause} />
      <PropertiesDialog file={(selectedFile || (propertiesId ? fileSystem[propertiesId] : null)) as any} open={propertiesOpen} onOpenChange={setPropertiesOpen} displayName={propertiesId ? explorer.getItemName(propertiesId) : ''} />

      <NewConnectionDialog
        open={newConnOpen}
        onOpenChange={setNewConnOpen}
        onCreated={(source) => {
          explorerToast.success('Connexion enregistrée', source.name);
          explorer.navigateTo(`source:${source.id}`);
        }}
      />
    </div>
  );
}
