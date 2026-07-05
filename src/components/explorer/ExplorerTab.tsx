import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useFileExplorer } from '@/hooks/useFileExplorer';
import { ExplorerSidebar } from '@/components/explorer/ExplorerSidebar';
import { Toolbar } from '@/components/explorer/Toolbar';
import { FileGrid } from '@/components/explorer/FileGrid';
import { PreviewPanel } from '@/components/explorer/PreviewPanel';
import { StatusBar } from '@/components/explorer/StatusBar';
import { DriveOverview } from '@/components/explorer/DriveOverview';
import { ExplorerContextMenu } from '@/components/explorer/ExplorerContextMenu';
import { PropertiesDialog } from '@/components/explorer/PropertiesDialog';
import { MobileDeviceView } from '@/components/explorer/MobileDeviceView';
import { GitHubPanel } from '@/components/explorer/GitHubPanel';
import { LocalServerDetail } from '@/components/explorer/LocalServerDetail';
import { CloudSourceBrowser } from '@/components/explorer/CloudSourceBrowser';
import { CopyProgressBar } from '@/components/explorer/CopyProgressBar';
import { CopyDetailDialog } from '@/components/explorer/CopyDetailDialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { fileSystem } from '@/data/mockFileSystem';
import { localServers } from '@/data/localServers';
import { useSound } from '@/hooks/useSound';
import { useFileOperations } from '@/hooks/useFileOperations';
import { preloadIcons } from '@/lib/iconCache';
import { resolveIconUrl } from '@/components/explorer/icons/iconRegistry';
import { CtxContext } from '@/components/explorer/contextMenuConfig';
import { TerminalPanel } from '@/components/explorer/TerminalPanel';
import { useNotifications } from '@/hooks/useNotifications';
import { explorerToast } from '@/components/explorer/ExplorerToasts';
import { CTX_EVENT, OpenCtxDetail } from '@/lib/contextMenuBus';
import { useExplorerSources } from '@/hooks/useExplorerSources';
import type { FileItem } from '@/types/fileExplorer';

interface Props {
  active: boolean;
  initialFolderId?: string;
  onFolderChange: (folderId: string) => void;
  onOpenCommandPalette: () => void;
}

const PINNED_KEY = 'explorer.quickAccess.pinned.v1';

function isPreviewMedia(item?: FileItem | null) {
  return !!item && ['image', 'video', 'audio'].includes(item.type);
}

function openFolderWindow(folderId: string) {
  const shell = typeof window !== 'undefined' ? (window as any).cognitiveWindow : null;
  if (shell?.openFolder) {
    shell.openFolder(folderId);
    return;
  }
  const url = new URL(window.location.href);
  url.hash = `/explorer?folderId=${encodeURIComponent(folderId)}`;
  window.open(url.toString(), '_blank', 'popup,width=1280,height=820');
}

function readPinned(): string[] {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'); } catch { return []; }
}

function writePinned(ids: string[]) {
  try { localStorage.setItem(PINNED_KEY, JSON.stringify(Array.from(new Set(ids)))); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent('explorer:pins-changed'));
}

export function ExplorerTab({ active, initialFolderId, onFolderChange, onOpenCommandPalette }: Props) {
  const explorer = useFileExplorer(initialFolderId);
  const { play } = useSound();
  const ops = useFileOperations();
  const [ctxMenu, setCtxMenu] = useState<{ visible: boolean; x: number; y: number; ctx: CtxContext; customAction?: OpenCtxDetail['onAction'] }>({
    visible: false, x: 0, y: 0,
    ctx: { isBackground: true, hasClipboard: false, selectedCount: 0, file: null },
  });
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [propertiesId, setPropertiesId] = useState<string | null>(null);
  const [showGithub, setShowGithub] = useState(false);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [activeSourcePath, setActiveSourcePath] = useState('/');
  const [activeSourceFile, setActiveSourceFile] = useState<FileItem | null>(null);
  const [sourceRefreshSignal, setSourceRefreshSignal] = useState(0);
  const [sourceTestSignal, setSourceTestSignal] = useState(0);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [githubDetail, setGithubDetail] = useState<{ headerLeft: ReactNode; headerRight: ReactNode; footer: ReactNode } | null>(null);
  const notif = useNotifications();
  const sourceApi = useExplorerSources();
  const didAutoOpenSource = useRef(false);

  useEffect(() => { onFolderChange(explorer.nav.currentFolderId); }, [explorer.nav.currentFolderId, onFolderChange]);

  useEffect(() => {
    const urls = explorer.currentChildren.map(f => resolveIconUrl({ type: f.type, extension: f.extension, name: f.name }));
    preloadIcons(urls);
  }, [explorer.currentChildren]);

  const handleOpen = useCallback((id: string) => {
    const item = fileSystem[id];
    if (item?.type === 'folder') { play('open'); explorer.navigateTo(id); }
    else {
      play('dblclick');
      explorer.selectItem(id);
      // Auto-open preview panel for media
      if (item && ['image', 'video', 'audio'].includes(item.type)) {
        explorer.openPreview();
      } else {
        explorer.openPreview();
      }
    }
  }, [explorer, play]);

  const handleSelect = useCallback((id: string, mode: 'single' | 'ctrl' | 'shift' = 'single') => {
    explorer.selectItem(id, mode);
    if (mode === 'single' && isPreviewMedia(fileSystem[id])) explorer.openPreview();
  }, [explorer]);

  const handleNavigate = useCallback((id: string) => {
    setShowGithub(false);
    setActiveServerId(null);
    setActiveSourceId(null);
    setActiveSourcePath('/');
    setActiveSourceFile(null);
    play('click');
    explorer.navigateTo(id);
  }, [explorer, play]);
  const handleNavigateVirtual = useCallback((id: 'this-pc' | 'network' | 'trash' | 'quick-access') => {
    setShowGithub(false); setActiveServerId(null); setActiveSourceId(null); setActiveSourcePath('/'); setActiveSourceFile(null); play('click'); explorer.navigateToLocation({ type: 'virtual', id });
  }, [explorer, play]);

  const handleOpenSource = useCallback((id: string, path = '/') => {
    setShowGithub(false);
    setActiveServerId(null);
    setActiveSourceId(id);
    setActiveSourcePath(path || '/');
    setActiveSourceFile(null);
    play('click');
  }, [play]);

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    explorer.selectItem(id);
    const file = fileSystem[id];
    setCtxMenu({
      visible: true, x: e.clientX, y: e.clientY,
      ctx: { isBackground: false, file, hasClipboard: explorer.clipboard.items.length > 0, selectedCount: 1 },
    });
  }, [explorer]);

  const handleBackgroundContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, [contenteditable="true"], .allow-select')) return;
    e.preventDefault();
    explorer.clearSelection();
    setCtxMenu({
      visible: true, x: e.clientX, y: e.clientY,
      ctx: { isBackground: true, hasClipboard: explorer.clipboard.items.length > 0, selectedCount: 0, file: null, targetId: explorer.nav.currentFolderId },
    });
  }, [explorer]);

  // Listen to global context-menu open events from sidebar/overview/github/mobile/server/terminal
  useEffect(() => {
    if (!active) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenCtxDetail>).detail;
      if (!detail) return;
      setCtxMenu({
        visible: true, x: detail.x, y: detail.y,
        ctx: { ...detail.ctx, hasClipboard: explorer.clipboard.items.length > 0 },
        customAction: detail.onAction,
      });
    };
    window.addEventListener(CTX_EVENT, handler);
    return () => window.removeEventListener(CTX_EVENT, handler);
  }, [active, explorer.clipboard.items.length]);

  const parentSourcePath = useCallback(() => {
    if (!activeSourcePath || activeSourcePath === '/') return '/';
    const parts = activeSourcePath.split('/').filter(Boolean);
    parts.pop();
    return parts.length ? `/${parts.join('/')}` : '/';
  }, [activeSourcePath]);

  const handleNavigatePath = useCallback((index: number) => {
    if (activeSourceId) {
      if (index <= 0) {
        setActiveSourcePath('/');
        return;
      }
      const parts = activeSourcePath.split('/').filter(Boolean).slice(0, index);
      setActiveSourcePath(parts.length ? `/${parts.join('/')}` : '/');
      return;
    }
    const pathIds: string[] = [];
    let current = explorer.nav.currentFolderId;
    while (current && fileSystem[current]) {
      pathIds.unshift(current);
      current = fileSystem[current].parentId || '';
    }
    if (index < pathIds.length) explorer.navigateTo(pathIds[index]);
  }, [activeSourceId, activeSourcePath, explorer]);

  const handleCopy = useCallback((ids: string[]) => { play('click'); explorer.copyItems(ids); explorerToast.success('Copié dans le presse-papiers', `${ids.length} élément(s)`); }, [explorer, play]);
  const handleCut = useCallback((ids: string[]) => { play('click'); explorer.cutItems(ids); explorerToast.info('Coupé', `${ids.length} élément(s)`); }, [explorer, play]);
  const handlePaste = useCallback((targetFolderId?: string) => {
    if (explorer.clipboard.items.length === 0) return;
    const items = explorer.clipboard.items.map(id => fileSystem[id]?.name || id);
    const totalBytes = explorer.clipboard.items.reduce((s, id) => s + (fileSystem[id]?.size || 1_000_000), 0);
    play('paste');
    ops.startJob({
      type: explorer.clipboard.operation === 'cut' ? 'move' : 'copy',
      source: items,
      destination: explorer.buildFullPath(targetFolderId || explorer.nav.currentFolderId),
      totalBytes,
      items,
    });
    explorer.pasteItems(targetFolderId);
  }, [explorer, ops, play]);
  const handleDelete = useCallback((ids: string[]) => {
    play('delete');
    const items = ids.map(id => fileSystem[id]?.name || id);
    ops.startJob({ type: 'delete', source: items, destination: 'Corbeille', items });
    explorer.deleteItems(ids);
  }, [explorer, ops, play]);
  const handleProperties = useCallback((id: string) => { setPropertiesId(id); setPropertiesOpen(true); }, []);
  const handleCopyPath = useCallback((id: string) => {
    navigator.clipboard?.writeText(explorer.buildFullPath(id));
    explorerToast.success('Chemin copié');
  }, [explorer]);
  const handleCopyName = useCallback((id: string) => {
    navigator.clipboard?.writeText(explorer.getItemName(id));
    explorerToast.success('Nom copié');
  }, [explorer]);
  const handleOpenTerminal = useCallback((folderId?: string) => {
    if (folderId && folderId !== explorer.nav.currentFolderId) explorer.navigateTo(folderId);
    setTerminalOpen(true);
    notif.push({ kind: 'info', title: 'Terminal ouvert', description: explorer.buildFullPath(folderId || explorer.nav.currentFolderId) });
    explorerToast.info('Terminal ouvert', explorer.buildFullPath(folderId || explorer.nav.currentFolderId));
  }, [explorer, notif]);

  const pinFolder = useCallback((id?: string) => {
    if (!id || fileSystem[id]?.type !== 'folder') return;
    writePinned([...readPinned(), id]);
    explorerToast.success('Épinglé à l\'accès rapide', fileSystem[id]?.name || id);
  }, []);

  const unpinFolder = useCallback((id?: string) => {
    if (!id) return;
    writePinned(readPinned().filter((pin) => pin !== id));
    explorerToast.info('Détaché de l\'accès rapide', fileSystem[id]?.name || id);
  }, []);

  const handleNewFile = useCallback((kind: string) => {
    explorer.createFolder();
    explorerToast.info(`Nouveau ${kind} créé`, 'Entrez le nom');
  }, [explorer]);

  const handleCompress = useCallback((ids: string[], format: 'zip' | '7z' | 'targz') => {
    if (ids.length === 0) return;
    const items = ids.map(id => fileSystem[id]?.name || id);
    const totalBytes = ids.reduce((s, id) => s + (fileSystem[id]?.size || 1_000_000), 0);
    const ext = format === 'targz' ? 'tar.gz' : format;
    const archiveName = `archive-${Date.now()}.${ext}`;
    play('paste');
    ops.startJob({
      type: 'compress',
      source: items,
      destination: archiveName,
      totalBytes,
      items,
    });
  }, [ops, play]);

  // Universal context-menu action dispatcher
  const handleCtxAction = useCallback((actionId: string) => {
    // Custom action override (sidebar/overview/etc)
    if (ctxMenu.customAction) {
      ctxMenu.customAction(actionId, ctxMenu.ctx);
      return;
    }
    const ctx = ctxMenu.ctx;
    const itemId = ctx.file?.id || ctx.targetId;
    const sourceTarget = itemId ? sourceApi.sources.find((source) => source.id === itemId) : null;
    if (sourceTarget) {
      switch (actionId) {
        case 'open':
        case 'open.tab':
        case 'open.right':
          handleOpenSource(sourceTarget.id, '/');
          explorerToast.success('Emplacement ouvert', sourceTarget.name);
          return;
        case 'open.window':
          handleOpenSource(sourceTarget.id, '/');
          explorerToast.info('Nouvelle fenêtre', 'Non disponible pour les sources réelles dans le navigateur.');
          return;
        case 'copy.path':
          navigator.clipboard?.writeText(sourceTarget.root || sourceTarget.host || sourceTarget.name);
          explorerToast.success('Chemin copié', sourceTarget.name);
          return;
        case 'pin':
          explorerToast.success('Source épinglée', sourceTarget.name);
          return;
        case 'terminal':
          handleOpenTerminal(explorer.nav.currentFolderId);
          return;
        case 'refresh':
          setSourceRefreshSignal((value) => value + 1);
          explorerToast.info('Actualisé', sourceTarget.name);
          return;
      }
    }
    switch (actionId) {
      case 'open': if (itemId) handleOpen(itemId); break;
      case 'open.tab':
        if (itemId && fileSystem[itemId]?.type === 'folder') {
          window.dispatchEvent(new CustomEvent('explorer:new-tab', { detail: { folderId: itemId } }));
        } else if (itemId) handleOpen(itemId);
        break;
      case 'open.right':
        if (itemId && fileSystem[itemId]?.type === 'folder') {
          window.dispatchEvent(new CustomEvent('explorer:open-right', { detail: { leftFolderId: explorer.nav.currentFolderId, rightFolderId: itemId } }));
        } else if (itemId) handleOpen(itemId);
        break;
      case 'open.window': if (itemId) openFolderWindow(itemId); break;
      case 'preview': if (itemId) { explorer.selectItem(itemId); explorer.openPreview(); } break;
      case 'cut': handleCut(itemId ? [itemId] : explorer.nav.selectedItems); break;
      case 'copy': handleCopy(itemId ? [itemId] : explorer.nav.selectedItems); break;
      case 'paste': handlePaste(ctx.isBackground ? explorer.nav.currentFolderId : itemId); break;
      case 'rename': if (itemId) explorer.startRename(itemId); break;
      case 'delete': handleDelete(itemId ? [itemId] : explorer.nav.selectedItems); break;
      case 'properties': handleProperties(itemId || explorer.nav.currentFolderId); break;
      case 'copy.path': if (itemId) handleCopyPath(itemId); else handleCopyPath(explorer.nav.currentFolderId); break;
      case 'copy.name': if (itemId) handleCopyName(itemId); break;
      case 'terminal': handleOpenTerminal(itemId || explorer.nav.currentFolderId); break;
      case 'refresh': play('loading'); explorerToast.info('Actualisé'); break;
      case 'new.folder': explorer.createFolder(); break;
      case 'new.txt': case 'new.docx': case 'new.xlsx': case 'new.pptx': case 'new.code':
        handleNewFile(actionId.split('.')[1]); break;
      case 'compress.zip': handleCompress(itemId ? [itemId] : explorer.nav.selectedItems, 'zip'); break;
      case 'compress.7z': handleCompress(itemId ? [itemId] : explorer.nav.selectedItems, '7z'); break;
      case 'compress.targz': handleCompress(itemId ? [itemId] : explorer.nav.selectedItems, 'targz'); break;
      case 'archive.extract.here':
      case 'archive.extract.named':
      case 'archive.extract.to':
        if (itemId) {
          const f = fileSystem[itemId];
          ops.startJob({ type: 'extract', source: [f?.name || itemId], destination: explorer.buildFullPath(explorer.nav.currentFolderId), totalBytes: (f?.size || 5_000_000), items: [f?.name || itemId] });
        }
        break;
      case 'pin': pinFolder(itemId); break;
      case 'unpin': unpinFolder(itemId); break;
      case 'share': explorerToast.info('Partage', 'Ouverture de la feuille de partage…'); break;
      case 'view': explorerToast.info('Affichage', 'Utilisez la barre d\'outils pour changer de vue'); break;
      case 'sort': explorerToast.info('Trier par', 'Cliquez sur un en-tête de colonne'); break;
      default:
        explorerToast.info(`Action : ${actionId}`, 'Simulation');
    }
  }, [ctxMenu, explorer, sourceApi.sources, handleCopy, handleCopyName, handleCopyPath, handleCut, handleDelete, handleOpen, handleOpenSource, handleOpenTerminal, handlePaste, handleProperties, handleNewFile, handleCompress, ops, play, pinFolder, unpinFolder]);

  const virtualId = explorer.nav.location.type === 'virtual' ? explorer.nav.location.id : null;
  const isMobileRoot = explorer.nav.currentFolderId === 'mobile-root';
  const activeServer = activeServerId ? localServers.find(s => s.id === activeServerId) : null;
  const activeSource = activeSourceId ? sourceApi.sources.find(s => s.id === activeSourceId) : null;
  const activeSourceCwd = activeSource?.root
    ? `${activeSource.root.replace(/[\\/]+$/, '')}${activeSourcePath === '/' ? '' : `\\${activeSourcePath.replace(/^\/+/, '').replace(/\//g, '\\')}`}`
    : undefined;
  const selectedFile = activeSource ? activeSourceFile : (explorer.nav.selectedItems.length === 1 ? fileSystem[explorer.nav.selectedItems[0]] : null);
  const selectedDisplayName = selectedFile ? (activeSource ? selectedFile.name : explorer.getItemName(selectedFile.id)) : '';
  const propertiesFile = propertiesId ? fileSystem[propertiesId] : null;

  useEffect(() => {
    if (!active || didAutoOpenSource.current || sourceApi.sources.length === 0) return;
    const defaultSource = sourceApi.sources.find((source) => source.id === 'local-home') || sourceApi.sources[0];
    if (!defaultSource) return;
    didAutoOpenSource.current = true;
    setShowGithub(false);
    setActiveServerId(null);
    setActiveSourceId(defaultSource.id);
    setActiveSourcePath('/');
    setActiveSourceFile(null);
  }, [active, sourceApi.sources]);

  useEffect(() => {
    if (!active) return;
    const onNav = (e: Event) => { const id = (e as CustomEvent).detail?.id; if (id) handleNavigate(id); };
    const onTogglePreview = () => explorer.togglePreview();
    const onToggleHidden = () => explorer.setShowHidden(!explorer.showHidden);
    const onOpenRepo = () => {
      // Ensure GitHub panel is visible; GitHubPanel listens for the same event to open the repo
      setShowGithub(true);
      setActiveServerId(null);
      setActiveSourceId(null);
    };
    window.addEventListener('explorer-nav', onNav);
    window.addEventListener('explorer-toggle-preview', onTogglePreview);
    window.addEventListener('explorer-toggle-hidden', onToggleHidden);
    window.addEventListener('github:open-repo', onOpenRepo);
    return () => {
      window.removeEventListener('explorer-nav', onNav);
      window.removeEventListener('explorer-toggle-preview', onTogglePreview);
      window.removeEventListener('explorer-toggle-hidden', onToggleHidden);
      window.removeEventListener('github:open-repo', onOpenRepo);
    };
  }, [active, explorer, handleNavigate]);

  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable = Boolean(target?.closest('input, textarea, [contenteditable="true"], .allow-select'));
      if (isEditable) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === 'F2' && explorer.nav.selectedItems.length === 1) { e.preventDefault(); explorer.startRename(explorer.nav.selectedItems[0]); }
      if (e.key === 'Delete' && explorer.nav.selectedItems.length > 0) { e.preventDefault(); handleDelete(explorer.nav.selectedItems); }
      if (ctrl && e.key.toLowerCase() === 'a') { e.preventDefault(); explorer.currentChildren.forEach((f, i) => explorer.selectItem(f.id, i === 0 ? 'single' : 'ctrl')); }
      if (ctrl && e.key.toLowerCase() === 'c' && explorer.nav.selectedItems.length > 0) { e.preventDefault(); handleCopy(explorer.nav.selectedItems); }
      if (ctrl && e.key.toLowerCase() === 'x' && explorer.nav.selectedItems.length > 0) { e.preventDefault(); handleCut(explorer.nav.selectedItems); }
      if (ctrl && e.key.toLowerCase() === 'v') { e.preventDefault(); handlePaste(); }
      if (e.altKey && e.key === 'Enter' && explorer.nav.selectedItems.length === 1) { e.preventDefault(); handleProperties(explorer.nav.selectedItems[0]); }
      if (e.key === 'Escape') { explorer.clearSelection(); explorer.cancelRename(); }
      if (ctrl && (e.key === '`' || e.key === '²')) { e.preventDefault(); setTerminalOpen(o => !o); }
      if (e.key === 'Backspace' && (e.target as HTMLElement)?.tagName !== 'INPUT' && explorer.canGoUp) { e.preventDefault(); explorer.goUp(); }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); explorer.goBack(); }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); explorer.goForward(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, explorer, handleCopy, handleCut, handlePaste, handleDelete, handleProperties]);

  const handleSidebarDrop = useCallback((targetFolderId: string, ids: string[], copy: boolean) => {
    play(copy ? 'paste' : 'click');
    // Actually perform the move/copy (not just show a UI job)
    if (copy) {
      explorer.copyItems(ids);
      // Select target folder and paste
      explorer.navigateTo(targetFolderId);
      setTimeout(() => explorer.pasteItems(), 0);
    } else {
      // Move: reparent items to target folder
      ids.forEach(id => {
        const item = fileSystem[id];
        if (item) {
          (fileSystem as any)[id] = { ...item, parentId: targetFolderId };
        }
      });
    }
    const items = ids.map(id => fileSystem[id]?.name || id);
    const totalBytes = ids.reduce((s, id) => s + (fileSystem[id]?.size || 1_000_000), 0);
    ops.startJob({
      type: copy ? 'copy' : 'move',
      source: items,
      destination: explorer.buildFullPath(targetFolderId) || targetFolderId,
      totalBytes,
      items,
    });
    explorer.clearSelection();
  }, [explorer, ops, play]);

  return (
    <div
      className="flex-1 flex flex-col min-w-0 min-h-0"
      style={{ display: active ? 'flex' : 'none', '--icon-scale': explorer.nav.iconSize / 80 } as React.CSSProperties & { '--icon-scale': number }}
    >
      <Toolbar
        path={activeSource ? [activeSource.name, ...activeSourcePath.split('/').filter(Boolean)] : explorer.nav.currentPath}
        viewMode={explorer.nav.viewMode}
        searchQuery={explorer.nav.searchQuery}
        showPreview={explorer.nav.showPreview}
        showHidden={explorer.showHidden}
        showExtensions={explorer.showExtensions}
        canGoBack={explorer.canGoBack}
        canGoForward={explorer.canGoForward}
        canGoUp={activeSource ? activeSourcePath !== '/' : explorer.canGoUp}
        selectedCount={explorer.nav.selectedItems.length}
        hasClipboard={explorer.clipboard.items.length > 0}
        sortField={explorer.nav.sortField}
        sortDirection={explorer.nav.sortDirection}
        onGoBack={explorer.goBack}
        onGoForward={explorer.goForward}
        onGoUp={activeSource ? () => setActiveSourcePath(parentSourcePath()) : explorer.goUp}
        onNavigatePath={handleNavigatePath}
        onViewChange={explorer.setViewMode}
        onSearch={explorer.setSearchQuery}
        onTogglePreview={explorer.togglePreview}
        onToggleHidden={() => explorer.setShowHidden(!explorer.showHidden)}
        onToggleExtensions={() => explorer.setShowExtensions(!explorer.showExtensions)}
        onSort={explorer.setSort}
        onCopy={() => handleCopy(explorer.nav.selectedItems)}
        onCut={() => handleCut(explorer.nav.selectedItems)}
        onPaste={() => handlePaste()}
        onDelete={() => handleDelete(explorer.nav.selectedItems)}
        onNewFolder={explorer.createFolder}
        onNewFile={(k) => handleNewFile(k)}
        onOpenTerminal={() => handleOpenTerminal()}
        onRename={() => { if (explorer.nav.selectedItems.length === 1) explorer.startRename(explorer.nav.selectedItems[0]); }}
        onRefresh={() => {
          play('loading');
          if (activeSource) setSourceRefreshSignal((value) => value + 1);
        }}
        onTestConnection={activeSource ? () => setSourceTestSignal((value) => value + 1) : undefined}
        contextActions={githubDetail?.headerRight}
        contextHeaderLeft={githubDetail?.headerLeft}
      />

      <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0" autoSaveId="explorer-vertical">
        <ResizablePanel defaultSize={terminalOpen ? 70 : 100} minSize={20}>
          <ResizablePanelGroup direction="horizontal" className="h-full min-h-0" autoSaveId="explorer-sidebar-main">
            <ResizablePanel defaultSize={16} minSize={8} maxSize={35} collapsible collapsedSize={3}>
              <ExplorerSidebar
                currentFolderId={explorer.nav.currentFolderId}
                expandedNodes={explorer.nav.expandedNodes}
                onNavigate={handleNavigate}
                onNavigateVirtual={handleNavigateVirtual}
                onToggleExpand={explorer.toggleExpanded}
                onOpenGithub={() => { setActiveServerId(null); setActiveSourceId(null); setActiveSourcePath('/'); setShowGithub(true); }}
                onOpenRepo={(repo) => {
                  setActiveServerId(null); setActiveSourceId(null); setActiveSourcePath('/'); setShowGithub(true);
                  window.dispatchEvent(new CustomEvent('github:open-repo', { detail: { fullName: repo.full_name } }));
                }}
                githubActive={showGithub}
                onSidebarDrop={handleSidebarDrop}
                onOpenSource={handleOpenSource}
                activeSourceId={activeSourceId}
                activeSourcePath={activeSourcePath}
              />
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-border/40" />
            <ResizablePanel defaultSize={84} minSize={40}>
              <div className="h-full flex overflow-hidden min-w-0" onContextMenu={handleBackgroundContextMenu}>
                {activeSource ? (
                  <CloudSourceBrowser
                    source={activeSource}
                    initialPath={activeSourcePath}
                    viewMode={explorer.nav.viewMode}
                    searchQuery={explorer.nav.searchQuery}
                    showExtensions={explorer.showExtensions}
                    iconSize={explorer.nav.iconSize}
                    sortField={explorer.nav.sortField}
                    sortDirection={explorer.nav.sortDirection}
                    onSort={explorer.setSort}
                    refreshSignal={sourceRefreshSignal}
                    testSignal={sourceTestSignal}
                    onPathChange={setActiveSourcePath}
                    onActiveFileChange={setActiveSourceFile}
                    onPreviewRequest={explorer.openPreview}
                    onBack={() => { setActiveSourceId(null); setActiveSourcePath('/'); setActiveSourceFile(null); }}
                  />
                ) : activeServer ? (
                  <LocalServerDetail server={activeServer} onBack={() => setActiveServerId(null)} />
                ) : showGithub ? (
                  <GitHubPanel onNavigate={handleNavigate} onDetailContextChange={setGithubDetail} />
                ) : (virtualId === 'this-pc' || virtualId === 'quick-access') ? (
                  <DriveOverview onNavigate={handleNavigate} onNavigateTrash={() => handleNavigateVirtual('trash')} mode="this-pc" onOpenSource={handleOpenSource} />
                ) : virtualId === 'network' ? (
                  <DriveOverview
                    onNavigate={handleNavigate}
                    mode="network"
                    onOpenSource={handleOpenSource}
                    onOpenLocalServer={(id) => { setShowGithub(false); setActiveSourceId(null); setActiveServerId(id); }}
                  />
                ) : isMobileRoot ? (
                  <MobileDeviceView onNavigate={handleNavigate} />
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
                    onSelect={handleSelect}
                    onOpen={handleOpen}
                    onContextMenu={handleContextMenu}
                    onClearSelection={explorer.clearSelection}
                    onConfirmRename={explorer.confirmRename}
                    onCancelRename={explorer.cancelRename}
                    onSort={explorer.setSort}
                    onDropOnFolder={(folderId, ids, copy) => handleSidebarDrop(folderId, ids, copy)}
                  />
                )}

                <AnimatePresence>
                  {explorer.nav.showPreview && (
                    <PreviewPanel file={selectedFile} displayName={selectedDisplayName} onClose={explorer.togglePreview} />
                  )}
                </AnimatePresence>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        {terminalOpen && (
          <>
            <ResizableHandle withHandle className="bg-border/40" />
            <ResizablePanel defaultSize={30} minSize={10} maxSize={70}>
              <TerminalPanel
                open={terminalOpen}
                cwd={explorer.nav.currentFolderId}
                cwdName={activeSourceCwd || explorer.buildFullPath(explorer.nav.currentFolderId)}
                cwdPath={activeSourceCwd}
                onClose={() => setTerminalOpen(false)}
                onCd={(id) => explorer.navigateTo(id)}
                onMkdir={() => explorer.createFolder()}
                onOpenInTab={() => {
                  window.dispatchEvent(new CustomEvent('explorer:new-terminal-tab'));
                  setTerminalOpen(false);
                }}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>


      <CopyProgressBar
        jobs={ops.jobs}
        onCancel={ops.cancelJob}
        onTogglePause={ops.togglePause}
        onOpenDetail={() => ops.setDetailOpen(true)}
      />

      <StatusBar
        files={explorer.currentChildren}
        selectedCount={explorer.nav.selectedItems.length}
        iconSize={explorer.nav.iconSize}
        onIconSizeChange={explorer.setIconSize}
        onOpenCommandPalette={onOpenCommandPalette}
        contextInfo={githubDetail?.footer}
      />

      <ExplorerContextMenu
        x={ctxMenu.x}
        y={ctxMenu.y}
        visible={ctxMenu.visible}
        ctx={ctxMenu.ctx}
        onClose={() => setCtxMenu(p => ({ ...p, visible: false }))}
        onAction={handleCtxAction}
      />

      <CopyDetailDialog
        open={ops.detailOpen}
        onOpenChange={ops.setDetailOpen}
        jobs={ops.jobs}
        onCancel={ops.cancelJob}
        onTogglePause={ops.togglePause}
      />

      <PropertiesDialog
        file={propertiesFile}
        open={propertiesOpen}
        onOpenChange={setPropertiesOpen}
        displayName={propertiesId ? explorer.getItemName(propertiesId) : ''}
      />
    </div>
  );
}
