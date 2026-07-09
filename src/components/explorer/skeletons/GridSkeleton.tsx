import { cn } from '@/lib/utils';

/**
 * Skeleton grid used while a directory listing is loading for the first time
 * (no cache). Uses a subtle shimmer + neutral surface tokens so it feels like
 * "the content is on its way", not "something is broken".
 */
export function GridSkeleton({ count = 24, size = 80, className }: { count?: number; size?: number; className?: string }) {
  return (
    <div
      className={cn('flex-1 p-4 overflow-hidden select-none', className)}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(96, size + 24)}px, 1fr))`,
        gap: 12,
        alignContent: 'start',
      }}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 opacity-70" style={{ animation: `skelPulse 1.4s ease-in-out ${i * 30}ms infinite` }}>
          <div className="rounded-lg bg-[hsl(var(--muted))] border border-border/30" style={{ width: size * 0.7, height: size * 0.7 }} />
          <div className="h-2.5 w-3/4 rounded bg-[hsl(var(--muted))] border border-border/20" />
          <div className="h-2 w-1/2 rounded bg-[hsl(var(--muted))] border border-border/10" />
        </div>
      ))}
      <style>{`@keyframes skelPulse { 0%,100% { opacity: .35 } 50% { opacity: .7 } }`}</style>
    </div>
  );
}

export function ListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="flex-1 p-2 flex flex-col gap-1.5" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 h-7 px-2 rounded opacity-70" style={{ animation: `skelPulse 1.4s ease-in-out ${i * 40}ms infinite` }}>
          <div className="w-4 h-4 rounded bg-[hsl(var(--muted))] border border-border/30" />
          <div className="h-2.5 rounded bg-[hsl(var(--muted))] border border-border/20" style={{ width: `${30 + (i * 7) % 50}%` }} />
          <div className="ml-auto h-2 w-16 rounded bg-[hsl(var(--muted))] border border-border/10" />
        </div>
      ))}
      <style>{`@keyframes skelPulse { 0%,100% { opacity: .35 } 50% { opacity: .7 } }`}</style>
    </div>
  );
}
