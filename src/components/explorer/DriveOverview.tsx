import { useEffect, useMemo, useState } from 'react';
import { Plus, Server, WifiOff } from 'lucide-react';
import { HDIcon } from './icons/HDIcon';
import { LocationIcon } from './FileIcon';
import { useI18n } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { openContextMenu } from '@/lib/contextMenuBus';
import { useExplorerSources } from '@/hooks/useExplorerSources';
import { NewConnectionDialog } from './NewConnectionDialog';
import { localServers } from '@/data/localServers';
import { explorerToast } from './ExplorerToasts';
import { api } from '@/lib/apiClient';
import { providerLocationKey } from '@/lib/providerIcons';
import type { LocationKey } from '@/lib/iconResolver';
import type { ExplorerSource } from '@/types/explorerSources';
import type { LocalServer } from '@/data/localServers';

interface Props {
  onNavigate: (id: string) => void;
  onNavigateTrash?: () => void;
  onOpenLocalServer?: (id: string, server?: LocalServer) => void;
  onOpenSource?: (id: string, path?: string) => void;
  mode: 'this-pc' | 'network';
}

const QUICK_ACCESS: Array<{ id: string; label: string; path: string; iconKey: LocationKey }> = [
  { id: 'desktop', label: 'Bureau', path: '/Desktop', iconKey: 'desktop' },
  { id: 'downloads', label: 'Téléchargements', path: '/Downloads', iconKey: 'downloads' },
  { id: 'documents', label: 'Documents', path: '/Documents', iconKey: 'documents' },
  { id: 'pictures', label: 'Images', path: '/Pictures', iconKey: 'pictures' },
  { id: 'music', label: 'Musique', path: '/Music', iconKey: 'music' },
  { id: 'videos', label: 'Vidéos', path: '/Videos', iconKey: 'videos' },
];

function isDriveSource(source: ExplorerSource) {
  return source.type === 'local' && Boolean(source.driveInfo);
}

function isHomeSource(source: ExplorerSource) {
  return source.type === 'local' && source.id === 'local-home';
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return '0 Go';
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} Go`;
}

function driveIconKey(source: ExplorerSource): LocationKey {
  const mount = source.driveInfo?.mount || source.root || '';
  if (/^C:/i.test(mount)) return 'driveSystem';
  return 'driveData';
}

function sourceIconKey(source: ExplorerSource): LocationKey {
  return providerLocationKey(source.provider, source.type);
}

function EmptyStateLine({ title, description }: { title: string; description: string }) {
  return (
    <div className="col-span-full flex items-center gap-3 border border-border/40 rounded-md p-4 bg-[hsl(var(--muted))]/40 text-muted-foreground">
      <WifiOff size={18} className="shrink-0" />
      <div>
        <p className="text-[12px] text-foreground/80">{title}</p>
        <p className="text-[11px] font-light mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function networkKind(source: ExplorerSource) {
  const provider = (source as ExplorerSource & { provider?: string }).provider || source.type;
  if (provider === 'gdrive') return 'gdrive';
  if (provider === 'onedrive') return 'onedrive';
  if (provider === 'ftp' || provider === 'sftp') return 'ftp';
  if (provider === 'smb') return 'smb';
  return 'cloud';
}

export function DriveOverview({ onNavigateTrash, onOpenLocalServer, onOpenSource, mode }: Props) {
  const { t } = useI18n();
  const { sources, isAvailable, refresh } = useExplorerSources();
  const [ftpOpen, setFtpOpen] = useState(false);
  const [detectedServers, setDetectedServers] = useState<LocalServer[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.get<{ success: boolean; data: LocalServer[] }>('/api/system/local-services')
      .then((r) => { if (!cancelled && r.success) setDetectedServers(r.data || []); })
      .catch(() => { if (!cancelled) setDetectedServers([]); });
    return () => { cancelled = true; };
  }, []);

  const homeSource = useMemo(() => sources.find(isHomeSource) || sources.find((source) => source.type === 'local'), [sources]);
  const localDrives = useMemo(() => sources.filter(isDriveSource), [sources]);
  const networkSources = useMemo(() => sources.filter((source) => source.type !== 'local'), [sources]);

  if (mode === 'network') {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-label flex items-center gap-2">
            <Server size={11} className="text-primary/80" />
            Sources réseau / cloud
          </h2>
          <button
            onClick={() => setFtpOpen(true)}
            className="h-8 px-3 rounded border border-border/40 hover:bg-[hsl(var(--explorer-hover))] text-[12px] flex items-center gap-1.5"
          >
            <Plus size={12} /> Ajouter source
          </button>
        </div>

        <h3 className="section-label mb-3">Serveurs locaux</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-7">
          {(detectedServers.length ? detectedServers : []).map((server) => (
            <div
              key={server.id}
              onClick={() => onOpenLocalServer?.(server.id, server)}
              onContextMenu={(e) => openContextMenu(e, {
                isBackground: false,
                isServer: true,
                serverKind: server.framework.toLowerCase().includes('postgres') ? 'db' : server.framework.toLowerCase().includes('redis') ? 'cache' : 'http',
                serverRunning: server.status === 'running',
                file: null,
                hasClipboard: false,
                selectedCount: 1,
                targetId: server.id,
              }, async (actionId) => {
                if (actionId === 'open') onOpenLocalServer?.(server.id, server);
                else if (actionId === 'server.browser' || actionId === 'copy.url') {
                  if (actionId === 'server.browser') window.open(server.url, '_blank', 'noopener,noreferrer');
                  else { await navigator.clipboard?.writeText(server.url); explorerToast.success('URL copiée', server.url); }
                } else explorerToast.network(`Serveur · ${actionId}`, server.name);
              })}
              className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors"
            >
              <Server size={30} className="text-primary/80 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-normal truncate">{server.name}</p>
                <p className="text-[11px] text-muted-foreground truncate font-mono">:{server.port} · {server.framework}</p>
              </div>
              <span className={cn('w-2 h-2 rounded-full shrink-0', server.status === 'running' ? 'bg-emerald-400' : server.status === 'error' ? 'bg-red-400' : 'bg-muted-foreground/50')} />
            </div>
          ))}
          {detectedServers.length === 0 && (
            <EmptyStateLine title="Aucun serveur local réel détecté" description="Les services apparaîtront ici dès qu'un port en écoute est détecté." />
          )}
        </div>

        <h3 className="section-label mb-3">Emplacements réseau</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {networkSources.length === 0 ? (
            <EmptyStateLine
              title="Aucune source réseau réelle configurée"
              description={isAvailable ? 'Ajoutez une connexion FTP pour la faire apparaitre ici.' : 'Demarrez l API locale de l explorateur pour charger les sources.'}
            />
          ) : networkSources.map((source) => (
            <div
              key={source.id}
              onClick={() => onOpenSource?.(source.id, '/')}
              onContextMenu={(e) => openContextMenu(e, {
                isBackground: false,
                isNetwork: true,
                networkKind: networkKind(source),
                file: null,
                hasClipboard: false,
                selectedCount: 1,
                targetId: source.id,
              }, async (actionId) => {
                if (actionId === 'open' || actionId === 'open.tab') onOpenSource?.(source.id, '/');
                else if (actionId === 'copy.path') { await navigator.clipboard?.writeText(source.root || source.host || source.name); explorerToast.success('Chemin copié', source.name); }
                else explorerToast.network(`Réseau · ${actionId}`, source.name);
              })}
              className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors"
            >
              <LocationIcon locationKey={sourceIconKey(source)} size={36} alt={source.name} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-normal truncate">{source.name}</p>
                <p className="text-[11px] text-muted-foreground truncate font-mono">
                  {source.type === 'ftp' ? `${source.host || 'ftp'}:${source.port || 21}` : source.root || source.type}
                </p>
              </div>
              <span className={cn(
                'w-2 h-2 rounded-full shrink-0',
                source.status === 'connected' || source.status === 'configured' ? 'bg-emerald-400' : 'bg-red-400/60',
              )} />
            </div>
          ))}
        </div>

        <NewConnectionDialog
          open={ftpOpen}
          onOpenChange={setFtpOpen}
          onCreated={(source) => {
            void refresh();
            onOpenSource?.(source.id, '/');
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="section-label mb-3">{t('drives.frequentFolders')}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-8">
        {!homeSource ? (
          <EmptyStateLine
            title="Dossier utilisateur indisponible"
            description={isAvailable ? 'La source locale utilisateur n a pas ete exposee par l API.' : 'Demarrez l API locale de l explorateur.'}
          />
        ) : QUICK_ACCESS.map((item) => (
          <div
            key={item.id}
            onClick={() => onOpenSource?.(homeSource.id, item.path)}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors"
          >
            <LocationIcon locationKey={item.iconKey} size={44} alt={item.label} />
            <span className="text-[12px] font-light text-center truncate w-full">{item.label}</span>
          </div>
        ))}
        {onNavigateTrash && (
          <div
            onClick={onNavigateTrash}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors"
          >
            <LocationIcon locationKey="trashEmpty" size={44} alt={t('drives.recycleBin')} />
            <span className="text-[12px] font-light text-center truncate w-full">{t('drives.recycleBin')}</span>
          </div>
        )}
      </div>

      <h2 className="section-label mb-3">{t('drives.devicesAndDrives')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {localDrives.length === 0 ? (
          <EmptyStateLine
            title="Aucun lecteur reel detecte"
            description={isAvailable ? 'L API locale n a retourne aucun disque local.' : 'Demarrez l API locale de l explorateur.'}
          />
        ) : localDrives.map((source) => {
          const usage = source.driveInfo?.usage || 0;
          const total = source.driveInfo?.total || 0;
          const used = source.driveInfo?.used || 0;
          const free = Math.max(total - used, 0);
          return (
            <div
              key={source.id}
              onClick={() => onOpenSource?.(source.id, '/')}
              onContextMenu={(e) => openContextMenu(e, {
                isBackground: false,
                isDrive: true,
                driveKind: (source.driveInfo?.mount || '').toUpperCase().startsWith('C:') ? 'system' : 'data',
                driveLetter: source.driveInfo?.mount?.[0] || source.name[0],
                file: null,
                hasClipboard: false,
                selectedCount: 0,
                targetId: source.id,
              })}
              className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--explorer-hover))] cursor-pointer transition-colors"
            >
              <LocationIcon locationKey={driveIconKey(source)} size={40} alt={source.name} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-normal truncate">{source.name}</p>
                <div className="w-full h-[4px] rounded-full bg-background mt-1.5">
                  <div
                    className={cn('h-full rounded-full transition-all', usage > 90 ? 'bg-red-500' : usage > 70 ? 'bg-amber-500' : 'bg-primary/60')}
                    style={{ width: `${Math.max(0, Math.min(100, usage))}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 font-light">
                  {formatBytes(free)} libre sur {formatBytes(total)} · {source.driveInfo?.fsType || 'FS'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
