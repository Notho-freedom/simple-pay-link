import { CopyJob } from '@/hooks/useFileOperations';
import { Pause, Play, X, FileText, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  jobs: CopyJob[];
  onCancel: (id: string) => void;
  onTogglePause: (id: string) => void;
  onOpenDetail: () => void;
}

const formatSize = (b: number) => {
  if (b < 1024) return `${b.toFixed(0)} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
};

const verb = (t: CopyJob['type']) =>
  t === 'copy' ? 'Copie' : t === 'move' ? 'Déplacement' : 'Suppression';

export function CopyProgressBar({ jobs, onCancel, onTogglePause, onOpenDetail }: Props) {
  if (jobs.length === 0) return null;
  const active = jobs.filter((j) => j.status !== 'done' && j.status !== 'cancelled');
  if (active.length === 0) return null;

  const totalBytes = active.reduce((s, j) => s + j.totalBytes, 0);
  const copiedBytes = active.reduce((s, j) => s + j.copiedBytes, 0);
  const pct = Math.min(100, Math.round((copiedBytes / totalBytes) * 100));
  const speed = active.reduce((s, j) => s + j.speed, 0);
  const primary = active[0];

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-[hsl(var(--explorer-surface))] border-t border-border/40 text-[11px] font-light shrink-0">
      <FileText size={12} className="text-primary shrink-0" />
      <div className="flex flex-col min-w-0 max-w-[280px]">
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-foreground/80 font-mono">
            {verb(primary.type)} · {active.length > 1 ? `${active.length} opérations` : `${pct}%`}
          </span>
          <span className="text-muted-foreground truncate font-mono">
            {primary.currentItem}
          </span>
        </div>
        <div className="h-[3px] w-full bg-muted rounded-full overflow-hidden mt-0.5">
          <div
            className={cn(
              'h-full transition-all rounded-full',
              primary.status === 'paused' ? 'bg-amber-400/70' : 'bg-primary'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
        {formatSize(speed)}/s
      </span>
      <button
        onClick={() => onTogglePause(primary.id)}
        className="h-5 w-5 flex items-center justify-center rounded hover:bg-[hsl(var(--explorer-hover))]"
        title={primary.status === 'paused' ? 'Reprendre' : 'Pause'}
      >
        {primary.status === 'paused' ? <Play size={10} /> : <Pause size={10} />}
      </button>
      <button
        onClick={onOpenDetail}
        className="h-5 w-5 flex items-center justify-center rounded hover:bg-[hsl(var(--explorer-hover))]"
        title="Détails"
      >
        <Maximize2 size={10} />
      </button>
      <button
        onClick={() => onCancel(primary.id)}
        className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400"
        title="Annuler"
      >
        <X size={11} />
      </button>
    </div>
  );
}
