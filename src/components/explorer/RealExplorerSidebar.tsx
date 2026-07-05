import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Loader2, Lock, Globe, Server } from 'lucide-react';
import { LocationIcon } from './FileIcon';
import { HDIcon } from './icons/HDIcon';
import { cn } from '@/lib/utils';
import { REAL_VIRTUAL_PATHS } from '@/hooks/useRealFileExplorer';
import { NewConnectionDialog } from './NewConnectionDialog';
import { api } from '@/lib/apiClient';
import { localServers } from '@/data/localServers';
import type { LocationKey } from '@/lib/iconResolver';

interface DriveInfo { mount: string; label?: string; usage?: number }
interface CustomSource { id: string; type: string; name: string; host?: string; root?: string }
interface RecentRepo { id: number; name: string; full_name: string; private: boolean; language: string | null; html_url: string }
interface DirEntry { name: string; path: string; isDirectory: boolean }

interface Props {
  currentPath: string;
  drives: DriveInfo[];
  onNavigate: (path: string) => void;
}

const QUICK: Array<{ label: string; path: string; key: LocationKey }> = [
  { label: 'Bureau',         path: '~/Desktop',    key: 'desktop' },
  { label: 'Téléchargements', path: '~/Downloads', key: 'downloads' },
  { label: 'Documents',      path: '~/Documents',  key: 'documents' },
  { label: 'Images',         path: '~/Pictures',   key: 'pictures' },
  { label: 'Musique',        path: '~/Music',      key: 'music' },
  { label: 'Vidéos',         path: '~/Videos',     key: 'videos' },
];

const STORE_KEY = 'real-explorer.sidebar.collapsed';
const EXPANDED_KEY = 'real-explorer.sidebar.expanded';
const GH_ICON = 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/github.svg';

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}

function Section({ id, label, collapsed, onToggle, action, children }: {
  id: string; label: string; collapsed: boolean; onToggle: (id: string) => void;
  action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between pr-2 group">
        <button onClick={() => onToggle(id)} className="flex items-center gap-1 flex-1 px-3 pt-3 pb-1 select-none hover:text-foreground transition-colors">
          {collapsed ? <ChevronRight size={9} className="text-muted-foreground/50" /> : <ChevronDown size={9} className="text-muted-foreground/50" />}
          <span className="section-label">{label}</span>
        </button>
        {action}
      </div>
      {!collapsed && children}
    </div>
  );
}

function Item({ locationKey, path, label, active, indent = 0, onClick, right, onDelete, expandable, expanded, onToggleExpand, loading, icon }: {
  locationKey?: LocationKey; path?: string; label: string; active?: boolean; indent?: number;
  onClick: () => void; right?: React.ReactNode; onDelete?: () => void;
  expandable?: boolean; expanded?: boolean; onToggleExpand?: () => void; loading?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn(
      'group flex items-center w-full pr-1 transition-colors',
      'hover:bg-[hsl(var(--explorer-hover))]',
      active && 'bg-[hsl(var(--explorer-selected))] text-foreground',
    )}
      style={{ paddingLeft: 8 + indent * 12 }}
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
      <button onClick={onClick} className="flex items-center gap-2 flex-1 py-[4px] text-[12px] font-light text-left min-w-0">
        {icon ? icon : locationKey ? <LocationIcon locationKey={locationKey} path={path} size={16} alt={label} /> : null}
        <span className="truncate flex-1">{label}</span>
        {right}
      </button>
      {onDelete && (
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[hsl(var(--muted))] text-muted-foreground hover:text-red-400" title="Supprimer">
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
}

export function RealExplorerSidebar({ currentPath, drives, onNavigate }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => readJson(STORE_KEY, {}));
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => readJson(EXPANDED_KEY, {}));
  const [children, setChildren] = useState<Record<string, DirEntry[]>>({});
  const [loadingPath, setLoadingPath] = useState<Record<string, boolean>>({});
  const [sources, setSources] = useState<CustomSource[]>([]);
  const [recentRepos, setRecentRepos] = useState<RecentRepo[]>([]);
  const [ftpOpen, setFtpOpen] = useState(false);

  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(collapsed)); } catch { /* noop */ } }, [collapsed]);
  useEffect(() => { try { localStorage.setItem(EXPANDED_KEY, JSON.stringify(expanded)); } catch { /* noop */ } }, [expanded]);

  const toggle = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const refreshSources = useCallback(async () => {
    try {
      const r = await api.get<{ success: boolean; sources: CustomSource[] }>('/api/sources');
      setSources(r?.success ? r.sources : []);
    } catch { setSources([]); }
  }, []);
  useEffect(() => { void refreshSources(); }, [refreshSources]);

  const loadRecentRepos = useCallback(() => {
    const raw = readJson<{ repos?: RecentRepo[] } | null>('explorer.github.recent', null);
    setRecentRepos(raw?.repos || []);
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

  const loadChildren = useCallback(async (path: string) => {
    setLoadingPath((prev) => ({ ...prev, [path]: true }));
    try {
      const r = await api.get<{ success: boolean; data?: { entries: DirEntry[] } }>(`/api/fs/list?path=${encodeURIComponent(path)}`);
      const entries = r?.data?.entries || [];
      setChildren((prev) => ({ ...prev, [path]: entries.filter((e) => e.isDirectory).slice(0, 60) }));
    } catch {
      setChildren((prev) => ({ ...prev, [path]: [] }));
    } finally {
      setLoadingPath((prev) => { const next = { ...prev }; delete next[path]; return next; });
    }
  }, []);

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [path]: !prev[path] };
      if (next[path] && !children[path]) void loadChildren(path);
      return next;
    });
  }, [children, loadChildren]);

  const removeSource = async (id: string) => {
    await api.del(`/api/sources/${id}`);
    void refreshSources();
  };

  const renderTree = (path: string, indent: number): React.ReactNode => {
    const kids = children[path];
    if (!expanded[path]) return null;
    if (!kids) return null;
    if (kids.length === 0) {
      return (
        <div style={{ paddingLeft: 8 + (indent + 1) * 12 }} className="text-[10px] text-muted-foreground/60 italic py-1">
          (vide)
        </div>
      );
    }
    return kids.map((entry) => {
      const isExpanded = !!expanded[entry.path];
      return (
        <div key={entry.path}>
          <Item
            locationKey="folder"
            path={entry.path}
            label={entry.name}
            indent={indent + 1}
            active={currentPath === entry.path}
            onClick={() => onNavigate(entry.path)}
            expandable
            expanded={isExpanded}
            loading={!!loadingPath[entry.path]}
            onToggleExpand={() => toggleExpand(entry.path)}
          />
          {renderTree(entry.path, indent + 1)}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))] overflow-y-auto w-60 shrink-0 select-none">
      <Section id="quick" label="Accès rapide" collapsed={!!collapsed.quick} onToggle={toggle}>
        {QUICK.map((item) => (
          <Item key={item.path} locationKey={item.key} path={item.path} label={item.label}
            active={currentPath === item.path} onClick={() => onNavigate(item.path)} />
        ))}
      </Section>

      <Section id="thispc" label="Ce PC" collapsed={!!collapsed.thispc} onToggle={toggle}>
        <Item locationKey="thisPC" label="Ce PC" active={currentPath === REAL_VIRTUAL_PATHS.thisPc} onClick={() => onNavigate(REAL_VIRTUAL_PATHS.thisPc)} />
        {drives.length === 0 && (
          <div className="px-4 py-2 text-[10px] text-muted-foreground/70 font-light italic">Aucun lecteur détecté</div>
        )}
        {drives.map((drive) => {
          const isSystem = String(drive.mount).toUpperCase().includes('C:');
          const isExpanded = !!expanded[drive.mount];
          return (
            <div key={drive.mount}>
              <Item
                locationKey={isSystem ? 'driveSystem' : 'driveData'}
                path={drive.mount}
                label={drive.label || drive.mount}
                active={currentPath === drive.mount}
                onClick={() => onNavigate(drive.mount)}
                expandable
                expanded={isExpanded}
                loading={!!loadingPath[drive.mount]}
                onToggleExpand={() => toggleExpand(drive.mount)}
                right={typeof drive.usage === 'number' ? <span className="text-[9px] font-mono text-muted-foreground/60">{Math.round(drive.usage)}%</span> : null}
              />
              {renderTree(drive.mount, 0)}
            </div>
          );
        })}
      </Section>

      <Section id="network" label="Réseau" collapsed={!!collapsed.network} onToggle={toggle}
        action={
          <button onClick={() => setFtpOpen(true)} className="p-1 rounded hover:bg-[hsl(var(--explorer-hover))] text-muted-foreground hover:text-foreground" title="Nouvelle connexion">
            <Plus size={11} />
          </button>
        }>
        <Item locationKey="network" label="Réseau" active={currentPath === REAL_VIRTUAL_PATHS.network} onClick={() => onNavigate(REAL_VIRTUAL_PATHS.network)} />
        {sources.length === 0 && (
          <div className="px-4 py-2 text-[10px] text-muted-foreground/70 font-light italic">Aucune connexion</div>
        )}
        {sources.map((s) => (
          <Item key={s.id} locationKey={s.type === 'ftp' ? 'cloud' : 'folder'}
            label={s.name} active={currentPath === `source:${s.id}`}
            onClick={() => onNavigate(`source:${s.id}`)}
            onDelete={() => removeSource(s.id)} />
        ))}
        <div className="mt-1 mb-1 px-3">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-mono">Serveurs locaux</span>
        </div>
        {localServers.map((server) => (
          <Item
            key={server.id}
            icon={<Server size={13} className={cn('shrink-0', server.status === 'running' ? 'text-emerald-400' : server.status === 'error' ? 'text-red-400' : 'text-muted-foreground/60')} />}
            label={`${server.name} · :${server.port}`}
            active={currentPath === `server:${server.id}`}
            onClick={() => onNavigate(`server:${server.id}`)}
          />
        ))}
      </Section>

      <Section id="github" label="GitHub" collapsed={!!collapsed.github} onToggle={toggle}>
        <Item locationKey="cloud" label="Tous les dépôts" active={currentPath === 'virtual:demo-github'} onClick={() => onNavigate('virtual:demo-github')} />
        {recentRepos.length === 0 ? (
          <div className="px-4 py-2 text-[10px] text-muted-foreground/70 font-light italic">Connectez-vous pour voir vos dépôts récents</div>
        ) : (
          recentRepos.map((repo) => (
            <Item
              key={repo.id}
              icon={<HDIcon src={GH_ICON} size={14} alt="repo" fallbackEmoji="📦" />}
              label={repo.name}
              onClick={() => onNavigate('virtual:demo-github')}
              right={repo.private ? <Lock size={9} className="text-amber-400/70" /> : <Globe size={9} className="text-muted-foreground/50" />}
            />
          ))
        )}
      </Section>

      <Section id="demo" label="Système" collapsed={!!collapsed.demo} onToggle={toggle}>
        <Item locationKey="trashEmpty" label="Corbeille" active={currentPath === 'recycle-bin'} onClick={() => onNavigate('recycle-bin')} />
      </Section>

      <div className="flex-1 min-h-4" />

      <NewConnectionDialog open={ftpOpen} onOpenChange={setFtpOpen}
        onCreated={() => { void refreshSources(); }} />
    </div>
  );
}
