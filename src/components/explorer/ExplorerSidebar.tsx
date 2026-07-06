'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { HDIcon } from './icons/HDIcon';
import { sidebarIcons } from './FileIcon';
import { useI18n } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { openContextMenu } from '@/lib/contextMenuBus';
import { useExplorerSources } from '@/hooks/useExplorerSources';
import { EXPLORER_DND_MIME } from '@/hooks/useDragDrop';
import { NewConnectionDialog } from './NewConnectionDialog';
import { GitHubAuthDialog } from './GitHubAuthDialog';
import { saveGithubToken } from './GitHubAuthCard';
import { explorerToast } from './ExplorerToasts';
import { fileSystem } from '@/data/mockFileSystem';
import { api } from '@/lib/apiClient';
import type { NetworkKind } from './contextMenuConfig';
import type { ExplorerSource } from '@/types/explorerSources';

interface Props {
  currentFolderId: string;
  expandedNodes: Set<string>;
  onNavigate: (id: string) => void;
  onNavigateVirtual: (id: 'this-pc' | 'network' | 'trash' | 'quick-access') => void;
  onToggleExpand: (id: string) => void;
  onOpenGithub: () => void;
  onOpenRepo?: (repo: RecentRepo) => void;
  githubActive: boolean;
  onSidebarDrop?: (targetFolderId: string, ids: string[], copy: boolean) => void;
  onOpenSource?: (id: string, path?: string) => void;
  activeSourceId?: string | null;
  activeSourcePath?: string;
}

interface DirEntry { name: string; path: string; isDirectory: boolean }
interface RecentRepo { id: number; name: string; full_name: string; private: boolean; language: string | null; html_url: string }
interface GitHubUser { login: string; avatar_url: string; name?: string }

const GH_ICON = 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/github.svg';
const REPO_ICONS: Record<string, string> = {
  'TypeScript': 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/typescript.svg',
  'JavaScript': 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/javascript.svg',
  'Python': 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/python.svg',
  'Rust': 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/rust.svg',
  'Go': 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/go.svg',
  'Java': 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/java.svg',
};

function getLangIcon(lang: string | null): string {
  if (!lang) return GH_ICON;
  return REPO_ICONS[lang] || GH_ICON;
}

const QUICK_ACCESS = [
  { id: 'desktop', label: 'Bureau', path: '/Desktop', icon: sidebarIcons.desktop },
  { id: 'downloads', label: 'Téléchargements', path: '/Downloads', icon: sidebarIcons.downloads },
  { id: 'documents', label: 'Documents', path: '/Documents', icon: sidebarIcons.documents },
  { id: 'pictures', label: 'Images', path: '/Pictures', icon: sidebarIcons.pictures },
  { id: 'music', label: 'Musique', path: '/Music', icon: sidebarIcons.music },
  { id: 'videos', label: 'Vidéos', path: '/Videos', icon: sidebarIcons.videos },
];

const netStatusDot = (status: string) => cn(
  'w-1.5 h-1.5 rounded-full shrink-0',
  status === 'connected' || status === 'configured' ? 'bg-emerald-400' : 'bg-red-400/60',
);

const STORE_KEY = 'explorer.sidebar.collapsed';
const PINNED_KEY = 'explorer.quickAccess.pinned.v1';
const LOCAL_SOURCES_KEY = 'explorer.sources.local.v1';
function readCollapsed(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
}

function isDriveSource(source: ExplorerSource) {
  return source.type === 'local' && Boolean(source.driveInfo);
}

function isHomeSource(source: ExplorerSource) {
  return source.type === 'local' && source.id === 'local-home';
}

function driveIcon(source: ExplorerSource) {
  const mount = source.driveInfo?.mount || source.root || '';
  if (/^[A-Z]:/i.test(mount) && mount.toUpperCase().startsWith('C:')) return sidebarIcons.driveSystem;
  return sidebarIcons.driveData;
}

function sourceIcon(source: ExplorerSource) {
  const provider = source.provider || source.type;
  if (provider === 'gdrive') return 'https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg';
  if (provider === 'onedrive') return 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg';
  if (provider === 'dropbox') return 'https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg';
  if (provider === 'box') return 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/box.svg';
  if (provider === 'icloud') return 'https://upload.wikimedia.org/wikipedia/commons/1/1c/ICloud_logo.svg';
  if (provider === 'webdav') return 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/webdav.svg';
  if (source.type === 'ftp' || provider === 'sftp' || provider === 'ftps') return sidebarIcons.ftp;
  if (source.type === 'cloud') return sidebarIcons.cloud;
  if (source.type === 'network') return sidebarIcons.network;
  return sidebarIcons.folder;
}

function networkKind(source: ExplorerSource): NetworkKind {
  const provider = (source as ExplorerSource & { provider?: string }).provider || source.type;
  if (provider === 'gdrive') return 'gdrive';
  if (provider === 'onedrive') return 'onedrive';
  if (provider === 'ftp' || provider === 'sftp') return 'ftp';
  if (provider === 'smb') return 'smb';
  return 'cloud';
}

function readPinned(): string[] {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'); } catch { return []; }
}

function SidebarItem({ icon, label, active, onClick, indent = 0, right, onContextMenu, expandable, expanded, onToggleExpand, loading, isCircular, folderId, onDrop }: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
  indent?: number;
  right?: React.ReactNode;
  onContextMenu?: (e: React.MouseEvent) => void;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  loading?: boolean;
  isCircular?: boolean;
  folderId?: string;
  onDrop?: (folderId: string, ids: string[], copy: boolean) => void;
}) {
  const [dropActive, setDropActive] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!folderId) return;
    const data = e.dataTransfer.getData(EXPLORER_DND_MIME);
    if (data) setDropActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDropActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropActive(false);
    if (!folderId) return;
    const data = e.dataTransfer.getData(EXPLORER_DND_MIME);
    if (data) {
      try {
        const ids = JSON.parse(data) as string[];
        onDrop?.(folderId, ids, e.ctrlKey || e.metaKey);
      } catch {
        // Ignore malformed data
      }
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-1 w-full py-[4px] pr-2 text-[12px] font-light transition-colors',
        'hover:bg-[hsl(var(--explorer-hover))]',
        active && 'bg-[hsl(var(--explorer-selected))] text-foreground font-normal',
        dropActive && 'ring-2 ring-primary/60 bg-primary/10',
      )}
      style={{ paddingLeft: `${indent * 14 + 16}px` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {expandable ? (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
          className="p-0.5 rounded hover:bg-[hsl(var(--muted))] text-muted-foreground/70 shrink-0"
          title={expanded ? 'Replier' : 'Déplier'}
        >
          {loading ? <Loader2 size={10} className="animate-spin" />
            : expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
      ) : (
        <span className="w-[14px] shrink-0" />
      )}
      <button
        onClick={onClick}
        onContextMenu={onContextMenu}
        className="flex items-center gap-2 flex-1"
      >
        {isCircular ? (
          <img src={icon} alt={label} className="w-4 h-4 rounded-full object-cover shrink-0" onError={(e) => { (e.target as any).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Ccircle cx=%2712%27 cy=%2712%27 r=%2710%27 fill=%22%23ccc%22/%3E%3C/svg%3E'; }} />
        ) : (
          <HDIcon src={icon} size={16} alt={label} fallbackEmoji="📁" />
        )}
        <span className="truncate flex-1 text-left">{label}</span>
      </button>
      {right}
    </div>
  );
}

function RecursiveTreeItem({
  entry,
  sourceId,
  indent = 0,
  onOpenSource,
  activeSourceId,
  activeSourcePath,
  expandedPaths,
  loadingPaths,
  onToggleExpand,
  listFn,
  onDrop,
}: {
  entry: DirEntry;
  sourceId: string;
  indent?: number;
  onOpenSource?: (id: string, path?: string) => void;
  activeSourceId?: string | null;
  activeSourcePath?: string;
  expandedPaths: Set<string>;
  loadingPaths: Set<string>;
  onToggleExpand: (path: string, sourceId: string) => Promise<void>;
  listFn: (sourceId: string, path: string, opts: any) => Promise<any>;
  onDrop?: (targetFolderId: string, ids: string[], copy: boolean) => void;
}) {
  const key = `${sourceId}:${entry.path}`;
  const isExpanded = expandedPaths.has(key);
  const isLoading = loadingPaths.has(key);
  const [children, setChildren] = useState<DirEntry[]>([]);

  const handleToggle = useCallback(async () => {
    await onToggleExpand(entry.path, sourceId);
    if (!isExpanded && children.length === 0) {
      try {
        const result = await listFn(sourceId, entry.path, { force: false });
        if (result.success && result.items) {
          const dirs = result.items
            .filter((item: any) => item.isDirectory)
            .map((item: any) => ({ name: item.name, path: item.path || `${entry.path}/${item.name}`, isDirectory: true }));
          setChildren(dirs);
        }
      } catch (err) {
        setChildren([]);
      }
    }
  }, [isExpanded, children.length, entry.path, sourceId, onToggleExpand, listFn]);

  return (
    <div key={key}>
      <SidebarItem
        icon={sidebarIcons.folder}
        label={entry.name}
        active={activeSourceId === sourceId && activeSourcePath === entry.path}
        onClick={() => onOpenSource?.(sourceId, entry.path)}
        indent={indent}
        expandable
        expanded={isExpanded}
        loading={isLoading}
        onToggleExpand={handleToggle}
        folderId={`${sourceId}:${entry.path}`}
        onDrop={(folderId, ids, copy) => onDrop?.(entry.path, ids, copy)}
      />
      {isExpanded && (
        <div>
          {children.length === 0 ? (
            <div style={{ paddingLeft: `${(indent + 1) * 14 + 16}px` }} className="text-[10px] text-muted-foreground/60 italic py-1">(vide)</div>
          ) : (
            children.map((child) => (
              <RecursiveTreeItem
                key={`${sourceId}:${child.path}`}
                entry={child}
                sourceId={sourceId}
                indent={indent + 1}
                onOpenSource={onOpenSource}
                activeSourceId={activeSourceId}
                activeSourcePath={activeSourcePath}
                expandedPaths={expandedPaths}
                loadingPaths={loadingPaths}
                onToggleExpand={onToggleExpand}
                listFn={listFn}
                onDrop={onDrop}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Section({ k, label, collapsed, onToggle, action, children }: {
  k: string;
  label: string;
  collapsed: boolean;
  onToggle: (k: string) => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between pr-2 group">
        <button
          onClick={() => onToggle(k)}
          className="flex items-center gap-1 flex-1 px-3 pt-3 pb-1 select-none hover:text-foreground transition-colors"
        >
          {collapsed
            ? <ChevronRight size={9} className="text-muted-foreground/50 group-hover:text-foreground" />
            : <ChevronDown size={9} className="text-muted-foreground/50 group-hover:text-foreground" />}
          <span className="section-label">{label}</span>
        </button>
        {action}
      </div>
      {!collapsed && children}
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-2 text-[10px] text-muted-foreground/70 font-light italic">{children}</div>;
}

export function ExplorerSidebar({
  currentFolderId,
  onNavigate,
  onNavigateVirtual,
  onOpenGithub,
  onOpenRepo,
  githubActive,
  onSidebarDrop,
  onOpenSource,
  activeSourceId,
  activeSourcePath = '/',
}: Props) {
  const { t } = useI18n();
  const { sources, isAvailable, list } = useExplorerSources();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => readCollapsed());
  const [ftpOpen, setFtpOpen] = useState(false);
  const [ghAuthOpen, setGhAuthOpen] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [driveRoots, setDriveRoots] = useState<Record<string, DirEntry[]>>({});
  const [recentRepos, setRecentRepos] = useState<RecentRepo[]>([]);
  const [ghUser, setGhUser] = useState<GitHubUser | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => readPinned());

  const readJson = <T,>(key: string, fallback: T): T => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
  };

  const loadRecentRepos = useCallback(() => {
    const raw = readJson<{ repos?: RecentRepo[]; user?: GitHubUser } | null>('explorer.github.recent', null);
    setRecentRepos(raw?.repos || []);
    setGhUser(raw?.user || null);
  }, []);

  useEffect(() => {
    loadRecentRepos();
    const handler = () => loadRecentRepos();
    window.addEventListener('github:recent-updated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('github:recent-updated', handler);
      window.removeEventListener('storage', handler);
    };
  }, [loadRecentRepos]);

  useEffect(() => {
    const handler = () => setPinnedIds(readPinned());
    window.addEventListener('explorer:pins-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('explorer:pins-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(collapsed)); } catch { /* ignore unavailable storage */ }
  }, [collapsed]);

  const toggleSection = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const loadDriveRoots = useCallback(async (sourceId: string) => {
    setLoadingPaths((prev) => new Set([...prev, sourceId]));
    try {
      const result = await list(sourceId, '/', { force: false });
      if (result.success && result.items) {
        const dirs = result.items
          .filter((item: any) => item.isDirectory)
          .map((item: any) => ({ name: item.name, path: item.path || `/${item.name}`, isDirectory: true }))
          .slice(0, 60);
        setDriveRoots((prev) => ({ ...prev, [sourceId]: dirs }));
      }
    } catch (err) {
      setDriveRoots((prev) => ({ ...prev, [sourceId]: [] }));
    } finally {
      setLoadingPaths((prev) => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
    }
  }, [list]);

  const toggleExpandPath = useCallback(async (path: string, sourceId: string) => {
    const key = `${sourceId}:${path}`;
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const homeSource = useMemo(() => sources.find(isHomeSource) || sources.find((source) => source.type === 'local'), [sources]);
  const localDrives = useMemo(() => sources.filter(isDriveSource), [sources]);
  const networkSources = useMemo(() => sources.filter((source) => source.type !== 'local'), [sources]);

  const isThisPC = currentFolderId === 'root' && !githubActive && !activeSourceId;
  const isTrash = currentFolderId === 'recycle-bin';
  const isNetwork = currentFolderId === 'network-root' && !githubActive && !activeSourceId;
  const isMobile = currentFolderId === 'mobile-root';

  const openHomePath = (path: string) => {
    if (!homeSource) return;
    onOpenSource?.(homeSource.id, path);
  };

  const handleSourceAction = async (actionId: string, source: ExplorerSource) => {
    if (actionId === 'open') { onOpenSource?.(source.id, '/'); return; }
    if (actionId === 'open.tab') { onOpenSource?.(source.id, '/'); explorerToast.info('Source ouverte', source.name); return; }
    if (actionId === 'refresh') { await list(source.id, '/', { force: true }); explorerToast.success('Source actualisée', source.name); return; }
    if (actionId === 'copy.path') { await navigator.clipboard?.writeText(source.root || source.host || source.name); explorerToast.success('Chemin réseau copié', source.name); return; }
    if (actionId === 'delete' || actionId === 'net.disconnect') {
      try {
        await api.del(`/api/sources/${encodeURIComponent(source.id)}`);
        const local = JSON.parse(localStorage.getItem(LOCAL_SOURCES_KEY) || '[]').filter((entry: ExplorerSource) => entry.id !== source.id);
        localStorage.setItem(LOCAL_SOURCES_KEY, JSON.stringify(local));
      } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent('explorer:sources-changed'));
      explorerToast.info('Emplacement retiré', source.name);
      return;
    }
    explorerToast.info(`Réseau · ${actionId}`, source.name);
  };

  const handleRepoAction = (actionId: string, repo: RecentRepo) => {
    if (actionId === 'open') { onOpenRepo?.(repo); return; }
    if (actionId === 'git.web') { window.open(repo.html_url, '_blank', 'noopener,noreferrer'); return; }
    if (actionId === 'copy.url') { void navigator.clipboard?.writeText(repo.html_url); explorerToast.success('URL copiée', repo.full_name); return; }
    if (actionId === 'git.history') { window.open(`${repo.html_url}/commits`, '_blank', 'noopener,noreferrer'); return; }
    if (actionId === 'git.pr') { window.open(`${repo.html_url}/pulls`, '_blank', 'noopener,noreferrer'); return; }
    explorerToast.git(`GitHub · ${actionId}`, repo.full_name);
  };

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))] overflow-y-auto thin-scrollbar w-full select-none">
      <Section k="quick" label={t('sidebar.quickAccess')} collapsed={!!collapsed.quick} onToggle={toggleSection}>
        {!homeSource && <EmptyLine>{isAvailable ? 'Dossier utilisateur indisponible' : 'API locale indisponible'}</EmptyLine>}
        {homeSource && QUICK_ACCESS.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeSourceId === homeSource.id && activeSourcePath.toLowerCase() === item.path.toLowerCase()}
            onClick={() => openHomePath(item.path)}
            onContextMenu={(e) => openContextMenu(e, {
              isBackground: false,
              isQuickAccess: true,
              file: fileSystem[item.id] || null,
              hasClipboard: false,
              selectedCount: 1,
              targetId: item.id,
            })}
          />
        ))}
        {pinnedIds.filter((id) => fileSystem[id]).map((id) => (
          <SidebarItem
            key={`pin-${id}`}
            icon={sidebarIcons.folder}
            label={fileSystem[id].name}
            active={currentFolderId === id}
            onClick={() => onNavigate(id)}
            onContextMenu={(e) => openContextMenu(e, {
              isBackground: false,
              isQuickAccess: true,
              file: fileSystem[id],
              hasClipboard: false,
              selectedCount: 1,
              targetId: id,
            })}
          />
        ))}
      </Section>

      <Section k="thispc" label={t('sidebar.thisPC')} collapsed={!!collapsed.thispc} onToggle={toggleSection}>
        <SidebarItem icon={sidebarIcons.thisPC} label={t('sidebar.thisPC')} active={isThisPC} onClick={() => onNavigateVirtual('this-pc')} />
        <SidebarItem icon={sidebarIcons.trashEmpty} label={t('sidebar.trash')} active={isTrash} onClick={() => onNavigateVirtual('trash')} indent={1} />
        {localDrives.length === 0 && <EmptyLine>{isAvailable ? 'Aucun lecteur détecté' : 'API locale indisponible'}</EmptyLine>}
        {localDrives.map((source) => {
          const children = driveRoots[source.id] || [];
          const isLoading = loadingPaths.has(source.id);
          const isExpanded = expandedPaths.has(source.id);
          const handleToggle = async () => {
            await toggleExpandPath(source.id, source.id);
            if (!isExpanded && !driveRoots[source.id]) {
              await loadDriveRoots(source.id);
            }
          };
          const handleClick = async () => {
            onOpenSource?.(source.id, '/');
            // Auto-expand tree the first time a drive is clicked
            if (!isExpanded) {
              await handleToggle();
            }
          };
          return (
            <div key={source.id}>
              <SidebarItem
                icon={driveIcon(source)}
                label={source.name}
                active={activeSourceId === source.id}
                onClick={handleClick}
                indent={1}
                expandable
                expanded={isExpanded}
                loading={isLoading}
                onToggleExpand={handleToggle}
                folderId={source.id}
                onDrop={onSidebarDrop}
                right={typeof source.driveInfo?.usage === 'number'
                  ? <span className="text-[9px] font-mono text-muted-foreground/60">{Math.round(source.driveInfo.usage)}%</span>
                  : null}
                onContextMenu={(e) => openContextMenu(e, {
                  isBackground: false,
                  isDrive: true,
                  driveKind: source.name.toUpperCase().includes('C:') ? 'system' : 'data',
                  driveLetter: source.driveInfo?.mount?.[0] || source.name[0],
                  file: null,
                  hasClipboard: false,
                  selectedCount: 0,
                  targetId: source.id,
                })}
              />
              {isExpanded && (
                <div>
                  {children.length === 0 ? (
                    <div style={{ paddingLeft: `${2 * 14 + 16}px` }} className="text-[10px] text-muted-foreground/60 italic py-1">(vide)</div>
                  ) : (
                    children.map((entry) => (
                      <RecursiveTreeItem
                        key={`${source.id}:${entry.path}`}
                        entry={entry}
                        sourceId={source.id}
                        indent={2}
                        onOpenSource={onOpenSource}
                        activeSourceId={activeSourceId}
                        activeSourcePath={activeSourcePath}
                        expandedPaths={expandedPaths}
                        loadingPaths={loadingPaths}
                        onToggleExpand={toggleExpandPath}
                        listFn={list}
                        onDrop={onSidebarDrop}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Section>

      <Section
        k="network"
        label={t('sidebar.network')}
        collapsed={!!collapsed.network}
        onToggle={toggleSection}
        action={
          <button
            onClick={() => setFtpOpen(true)}
            className="p-1 rounded hover:bg-[hsl(var(--explorer-hover))] text-muted-foreground hover:text-foreground"
            title="Nouvelle connexion FTP"
          >
            <Plus size={11} />
          </button>
        }
      >
        <SidebarItem icon={sidebarIcons.network} label={t('sidebar.network')} active={isNetwork} onClick={() => onNavigateVirtual('network')} />
        {networkSources.length === 0 && <EmptyLine>Aucune source réseau configurée</EmptyLine>}
        {networkSources.length > 0 && (
          <div className="max-h-[240px] overflow-y-auto thin-scrollbar">
            {networkSources.map((source) => (
              <SidebarItem
                key={source.id}
                icon={sourceIcon(source)}
                label={source.name}
                active={activeSourceId === source.id}
                onClick={() => onOpenSource?.(source.id, '/')}
                indent={1}
                right={<span className={netStatusDot(source.status)} />}
                onContextMenu={(e) => openContextMenu(e, {
                  isBackground: false,
                  isNetwork: true,
                  networkKind: networkKind(source),
                  file: null,
                  hasClipboard: false,
                  selectedCount: 1,
                  targetId: source.id,
                }, (actionId) => void handleSourceAction(actionId, source))}
              />
            ))}
          </div>
        )}
      </Section>

      <Section k="devices" label={t('sidebar.devices')} collapsed={!!collapsed.devices} onToggle={toggleSection}>
        <SidebarItem
          icon={sidebarIcons.phone}
          label="Appareils mobiles"
          active={isMobile}
          onClick={() => onNavigate('mobile-root')}
        />
        <EmptyLine>Aucun appareil mobile réel détecté</EmptyLine>
      </Section>

      <Section
        k="github"
        label={t('sidebar.github')}
        collapsed={!!collapsed.github}
        onToggle={toggleSection}
        action={
          <button
            onClick={() => setGhAuthOpen(true)}
            className="p-1 rounded hover:bg-[hsl(var(--explorer-hover))] text-muted-foreground hover:text-foreground"
            title="Ajouter un compte GitHub"
          >
            <Plus size={11} />
          </button>
        }
      >
        {ghUser ? (
          <SidebarItem
            icon={ghUser.avatar_url}
            label={ghUser.name || ghUser.login}
            active={githubActive}
            onClick={onOpenGithub}
            isCircular={true}
            onContextMenu={(e) => openContextMenu(e, {
              isBackground: false,
              isRepo: true,
              file: null,
              hasClipboard: false,
              selectedCount: 1,
              targetId: ghUser.login,
            })}
          />
        ) : (
          <EmptyLine>Aucun compte connecté</EmptyLine>
        )}
        {ghUser && recentRepos.length === 0 ? (
          <EmptyLine>Aucun dépôt récent</EmptyLine>
        ) : (
          recentRepos.slice(0, 8).map((repo) => {
            const langIcon = getLangIcon(repo.language);
            return (
              <SidebarItem
                key={repo.id}
                icon={langIcon}
                label={repo.name}
                active={false}
                onClick={() => onOpenRepo?.(repo)}
                indent={1}
                onContextMenu={(e) => openContextMenu(e, {
                  isBackground: false,
                  isRepo: true,
                  file: null,
                  hasClipboard: false,
                  selectedCount: 1,
                  targetId: repo.full_name,
                }, (actionId) => handleRepoAction(actionId, repo))}
              />
            );
          })
        )}
      </Section>

      <div className="flex-1 min-h-4" />

      <NewConnectionDialog
        open={ftpOpen}
        onOpenChange={setFtpOpen}
        onCreated={(source) => {
          void list(source.id, '/', { force: true });
          onOpenSource?.(source.id, '/');
        }}
      />

      <GitHubAuthDialog
        open={ghAuthOpen}
        onOpenChange={setGhAuthOpen}
        onAuthenticated={(token) => {
          saveGithubToken(token);
          // Trigger the GitHub panel to reload via a storage event tick + open it
          window.dispatchEvent(new CustomEvent('github:recent-updated'));
          onOpenGithub();
        }}
      />
    </div>
  );
}
