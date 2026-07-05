import { cn } from '@/lib/utils';

/**
 * Subtle indigo shimmer used across the explorer instead of spinners.
 * Respects the Midnight Indigo palette; renders three pulsing dots.
 */
export function LoadingShimmer({
  label,
  className,
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-2 text-[11px] font-light text-muted-foreground', className)}>
      <span className="relative inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:-0.32s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:-0.16s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      </span>
      {!compact && label && <span>{label}</span>}
    </div>
  );
}

/**
 * Skeleton row for lists — a shimmering horizontal bar. Chain multiple rows
 * for a full pending-list state.
 */
export function ShimmerRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-6 rounded overflow-hidden bg-[hsl(var(--muted))]/50 relative',
        className,
      )}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
    </div>
  );
}
