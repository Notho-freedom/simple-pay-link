import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Empty state used across every explorer view (drives empty, network empty,
 * filesystem folder empty, github without token, FTP disconnected, etc.).
 *
 * Always centered — this is the sole content of an empty view. Do NOT wrap it
 * with other elements: if you need siblings (headers, extra cards), the view
 * isn't empty.
 */
export function EmptyState({
  icon, title, description, actions, className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      'flex-1 min-h-full flex flex-col items-center justify-center text-center px-8 py-12 select-none',
      className,
    )}>
      {icon && (
        <div className="w-16 h-16 rounded-full bg-[hsl(var(--muted))] border border-border/40 flex items-center justify-center text-muted-foreground/70 mb-5">
          {icon}
        </div>
      )}
      <h3 className="text-[14px] font-normal text-foreground mb-1.5">{title}</h3>
      {description && (
        <p className="text-[12px] text-muted-foreground font-light max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {actions && <div className="mt-6 flex flex-wrap gap-2 justify-center">{actions}</div>}
    </div>
  );
}
