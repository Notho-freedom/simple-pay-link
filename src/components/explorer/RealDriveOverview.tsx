import { Activity, Globe, HardDrive, Network } from 'lucide-react';
import { LocationIcon } from './FileIcon';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/data/mockFileSystem';
import type { FileItem } from '@/types/fileExplorer';
import type { LocationKey } from '@/lib/iconResolver';

function quickKeyFor(name: string): LocationKey {
  const lower = name.toLowerCase();
  if (lower.includes('bureau') || lower.includes('desktop')) return 'desktop';
  if (lower.includes('telechar') || lower.includes('download')) return 'downloads';
  if (lower.includes('document')) return 'documents';
  if (lower.includes('image') || lower.includes('picture')) return 'pictures';
  if (lower.includes('musique') || lower.includes('music')) return 'music';
  if (lower.includes('video') || lower.includes('vidéo')) return 'videos';
  return 'folder';
}

interface Props {
  mode: 'this-pc' | 'network';
  entries: FileItem[];
  onNavigate: (path: string) => void;
  onAddFtp?: () => void;
}

function isDrive(item: FileItem) { return Boolean(item.driveInfo); }

export function RealDriveOverview({ mode, entries, onNavigate, onAddFtp }: Props) {
  const quick    = entries.filter((e) => !isDrive(e) && !e.id.startsWith('service:'));
  const drives   = entries.filter(isDrive);
  const services = entries.filter((e) => e.id.startsWith('service:'));

  if (mode === 'network') {
    // Always show a single centered empty-state when there's nothing to render.
    // Sources/services live in the sidebar — the main pane stays minimal.
    if (quick.length === 0 && services.length === 0) {
      return (
        <EmptyState
          icon={<Network size={26} />}
          title="Aucun emplacement réseau"
          description="Ajoutez une connexion (FTP, SFTP, SMB, WebDAV, Google Drive, OneDrive, Dropbox, S3…) via le bouton + dans la barre d'outils."
          actions={onAddFtp && (
            <button onClick={onAddFtp} className="h-8 px-3 text-[12px] rounded bg-primary/90 text-primary-foreground hover:bg-primary flex items-center gap-1.5">
              + Nouvelle connexion
            </button>
          )}
        />
      );
    }
    return (
      <div className="flex-1 overflow-auto p-6">
        {quick.length > 0 && (
          <>
            <h2 className="section-label mb-4">Emplacements réseau</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
              {quick.map((e) => (
                <button key={e.id} onClick={() => onNavigate(e.targetPath || e.path || e.id)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--explorer-hover))] transition-colors text-left">
                  <LocationIcon locationKey="network" path={e.path} size={36} alt={e.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-normal truncate">{e.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate font-mono">{e.path}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {services.length > 0 && (
          <>
            <h2 className="section-label mb-4 flex items-center gap-2">
              <Activity size={11} className="text-emerald-400/70" /> Serveurs locaux
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {services.map((e) => (
                <button key={e.id} onClick={() => onNavigate(e.targetPath || e.path || e.id)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--explorer-hover))] transition-colors text-left">
                  <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 bg-emerald-500/15 text-emerald-400">
                    <Globe size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-normal truncate">{e.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate font-mono">{e.path}</p>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-400 animate-pulse" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (drives.length === 0 && quick.length === 0) {
    return (
      <EmptyState
        icon={<HardDrive size={22} />}
        title="Aucun lecteur détecté"
        description="L'API système n'est pas disponible. Lancez l'application via Electron ou démarrez `npm run dev:explorer:api` pour parcourir vos disques."
      />
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {quick.length > 0 && (
        <>
          <h2 className="section-label mb-3">Dossiers fréquents</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-8">
            {quick.map((e) => (
              <button key={e.id} onClick={() => onNavigate(e.targetPath || e.path || e.id)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-[hsl(var(--explorer-hover))] transition-colors">
                <LocationIcon locationKey={quickKeyFor(e.name)} path={e.path} size={44} alt={e.name} />
                <span className="text-[12px] font-light text-center truncate w-full">{e.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {drives.length > 0 ? (
        <>
          <h2 className="section-label mb-3">Périphériques et lecteurs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {drives.map((e) => {
              const drive = e.driveInfo!;
              const pct = Math.round(drive.usage || 0);
              const free = Math.max(0, (drive.total || 0) - (drive.used || 0));
              const isSystem = e.name.toUpperCase().includes('C:');
              return (
                <button key={e.id} onClick={() => onNavigate(e.targetPath || e.path || e.id)}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--explorer-hover))] transition-colors text-left">
                  <LocationIcon locationKey={isSystem ? 'driveSystem' : 'driveData'} path={e.path} size={40} alt={e.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-normal truncate">{e.name}</p>
                    <div className="w-full h-[4px] rounded-full bg-background mt-1.5">
                      <div className={cn('h-full rounded-full transition-all',
                        pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-primary/60')}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 font-light">
                      {formatFileSize(free)} libres sur {formatFileSize(drive.total || 0)} · {drive.fsType || 'FS'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<HardDrive size={22} />}
          title="Aucun lecteur détecté"
          description="Vos disques apparaîtront ici dès que l'API système sera disponible."
        />
      )}
    </div>
  );
}
