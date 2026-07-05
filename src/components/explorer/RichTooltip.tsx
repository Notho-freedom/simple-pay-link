import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  title: string;
  description?: string;
  shortcut?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * Premium tooltip with title, description and keyboard shortcut badge.
 * Uses the shadcn Tooltip primitives under the hood + a glass-morphism style.
 */
export function RichTooltip({ children, title, description, shortcut, side = 'bottom', className }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        className={cn(
          'p-0 border border-border/50 bg-[hsl(var(--popover))]/95 backdrop-blur-xl shadow-2xl rounded-md overflow-hidden',
          'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:slide-in-from-top-1',
          className,
        )}
      >
        <div className="px-2.5 py-1.5 flex flex-col gap-0.5 min-w-[140px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-medium text-foreground">{title}</span>
            {shortcut && (
              <kbd className="font-mono text-[9px] text-muted-foreground/80 border border-border/60 rounded px-1 py-px bg-[hsl(var(--muted))]/60">
                {shortcut}
              </kbd>
            )}
          </div>
          {description && (
            <span className="text-[10.5px] text-muted-foreground/80 font-light leading-tight">{description}</span>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
