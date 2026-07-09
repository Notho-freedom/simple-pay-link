import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type Status = 'ok' | 'warning' | 'error' | 'info' | 'neutral';

interface MetaItem {
  label: string;
  value: string;
  mono?: boolean;
}

interface Props {
  children: ReactNode;
  title: string;
  description?: string;
  shortcut?: string;
  icon?: ReactNode;
  status?: Status;
  statusLabel?: string;
  meta?: MetaItem[];
  preview?: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  className?: string;
}

const STATUS_STYLES: Record<Status, string> = {
  ok: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  error: 'bg-red-500/15 text-red-300 border-red-500/30',
  info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  neutral: 'bg-muted/40 text-muted-foreground border-border/40',
};

/**
 * Premium tooltip with icon, title, description, shortcut badge, status pill,
 * meta rows and an optional preview slot (React node).
 * Animation: 120ms scale + fade, delay 500ms, close 100ms.
 */
export function RichTooltip({
  children,
  title,
  description,
  shortcut,
  icon,
  status,
  statusLabel,
  meta,
  preview,
  side = 'bottom',
  align = 'center',
  delayDuration = 500,
  className,
}: Props) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        sideOffset={6}
        className={cn(
          'p-0 border border-border/60 bg-[hsl(var(--popover))]/95 backdrop-blur-xl shadow-2xl rounded-lg overflow-hidden',
          'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'duration-[120ms]',
          className,
        )}
      >
        {preview && (
          <div className="border-b border-border/40 bg-[hsl(var(--muted))]/40 p-1.5">
            {preview}
          </div>
        )}
        <div className="px-2.5 py-1.5 flex flex-col gap-1 min-w-[160px] max-w-[320px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-1.5 min-w-0">
              {icon && <span className="text-muted-foreground/80 shrink-0">{icon}</span>}
              <span className="text-[12px] font-medium text-foreground truncate">{title}</span>
            </div>
            {shortcut && (
              <kbd className="font-mono text-[9px] text-muted-foreground/80 border border-border/60 rounded px-1 py-px bg-[hsl(var(--muted))]/60 shrink-0">
                {shortcut}
              </kbd>
            )}
          </div>
          {description && (
            <span className="text-[10.5px] text-muted-foreground/80 font-light leading-tight">{description}</span>
          )}
          {status && (
            <span className={cn('inline-flex self-start items-center gap-1 rounded-full px-1.5 py-px border text-[9.5px] font-medium', STATUS_STYLES[status])}>
              <span className="h-1 w-1 rounded-full bg-current" />
              {statusLabel || status}
            </span>
          )}
          {meta && meta.length > 0 && (
            <div className="mt-0.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
              {meta.map((row) => (
                <div key={row.label} className="contents">
                  <span className="text-[10px] text-muted-foreground/70 font-light">{row.label}</span>
                  <span className={cn('text-[10px] text-foreground/90 text-right truncate', row.mono && 'font-mono text-[9.5px]')}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
