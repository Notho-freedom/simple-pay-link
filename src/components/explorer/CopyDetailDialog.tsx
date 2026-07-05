import { CopyJob } from '@/hooks/useFileOperations';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pause, Play, X, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  jobs: CopyJob[];
  onCancel: (id: string) => void;
  onTogglePause: (id: string) => void;
}

const formatSize = (b: number) => {
  if (b < 1024) return `${b.toFixed(0)} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
};

const verb = (t: CopyJob['type']) =>
  t === 'copy' ? 'Copie en cours' : t === 'move' ? 'Déplacement en cours' : 'Suppression en cours';

export function CopyDetailDialog({ open, onOpenChange, jobs, onCancel, onTogglePause }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl glass-menu border-border/40 p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/30">
          <DialogTitle className="text-[14px] font-normal flex items-center gap-2">
            <FileText size={14} className="text-primary" />
            {jobs.length} opération(s) en cours
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
          {jobs.length === 0 && (
            <p className="text-center text-muted-foreground text-[12px] py-8 font-light">
              Aucune opération en cours.
            </p>
          )}
          {jobs.map((job) => {
            const pct = Math.round((job.copiedBytes / job.totalBytes) * 100);
            const eta = job.speed > 0 ? Math.round((job.totalBytes - job.copiedBytes) / job.speed) : 0;
            const isExp = !!expanded[job.id];
            return (
              <div key={job.id} className="border border-border/30 rounded-md p-3 bg-[hsl(var(--explorer-surface))]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[12px] font-normal flex-1">{verb(job.type)}</span>
                  <span className={cn(
                    'text-[10px] font-mono px-1.5 py-0.5 rounded',
                    job.status === 'running' && 'bg-primary/15 text-primary',
                    job.status === 'paused' && 'bg-amber-400/20 text-amber-400',
                    job.status === 'done' && 'bg-emerald-400/20 text-emerald-400',
                    job.status === 'cancelled' && 'bg-red-400/20 text-red-400'
                  )}>
                    {job.status}
                  </span>
                  <button onClick={() => onTogglePause(job.id)} className="h-6 w-6 rounded hover:bg-[hsl(var(--explorer-hover))] flex items-center justify-center">
                    {job.status === 'paused' ? <Play size={11} /> : <Pause size={11} />}
                  </button>
                  <button onClick={() => onCancel(job.id)} className="h-6 w-6 rounded hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center">
                    <X size={12} />
                  </button>
                </div>

                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                  <div
                    className={cn('h-full transition-all rounded-full',
                      job.status === 'paused' ? 'bg-amber-400/70' : 'bg-primary'
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground font-mono">
                  <div>Élément actuel : <span className="text-foreground/90 truncate inline-block max-w-[180px] align-bottom">{job.currentItem}</span></div>
                  <div>Vitesse : <span className="text-foreground/90">{formatSize(job.speed)}/s</span></div>
                  <div>Progression : <span className="text-foreground/90">{formatSize(job.copiedBytes)} / {formatSize(job.totalBytes)} ({pct}%)</span></div>
                  <div>Temps restant : <span className="text-foreground/90">{eta > 60 ? `${Math.floor(eta / 60)}m ${eta % 60}s` : `${eta}s`}</span></div>
                </div>

                <button
                  onClick={() => setExpanded((p) => ({ ...p, [job.id]: !p[job.id] }))}
                  className="text-[10px] text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1"
                >
                  {isExp ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  {isExp ? 'Masquer' : 'Afficher'} les éléments ({job.totalItems})
                </button>
                {isExp && (
                  <div className="mt-2 max-h-32 overflow-y-auto text-[10px] font-mono space-y-0.5 text-muted-foreground/80 border-t border-border/30 pt-2">
                    {job.source.map((s, i) => (
                      <div key={i} className="truncate">{s}</div>
                    ))}
                    <div className="text-foreground/70">→ {job.destination}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
