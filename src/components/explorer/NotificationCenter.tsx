import { Bell, Check, Trash2, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications, NotificationKind } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const kindStyle: Record<NotificationKind, string> = {
  info: 'text-primary',
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  git: 'text-violet-400',
  network: 'text-sky-400',
};

const fmt = (t: number) => {
  const dt = (Date.now() - t) / 1000;
  if (dt < 60) return `${Math.round(dt)}s`;
  if (dt < 3600) return `${Math.round(dt / 60)}m`;
  return `${Math.round(dt / 3600)}h`;
};

export function NotificationCenter() {
  const { list, unreadCount, markAllRead, clear, remove } = useNotifications();

  return (
    <Popover onOpenChange={(o) => o && markAllRead()}>
      <PopoverTrigger asChild>
        <button
          className="relative h-5 w-5 flex items-center justify-center rounded hover:bg-[hsl(var(--explorer-hover))] transition-colors"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={11} className={unreadCount > 0 ? 'text-primary' : ''} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[12px] h-3 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-mono leading-none flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="glass-menu w-80 p-0 border-border/40">
        <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
          <span className="text-[12px] font-normal">Notifications</span>
          <div className="flex gap-1">
            <button
              onClick={markAllRead}
              className="h-5 px-1.5 text-[10px] rounded hover:bg-[hsl(var(--explorer-hover))] flex items-center gap-1"
              title="Tout marquer comme lu"
            >
              <Check size={10} />
            </button>
            <button
              onClick={clear}
              className="h-5 px-1.5 text-[10px] rounded hover:bg-red-500/20 hover:text-red-400 flex items-center gap-1"
              title="Effacer tout"
            >
              <Trash2 size={10} />
            </button>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {list.length === 0 && (
            <p className="text-center text-[11px] text-muted-foreground py-8 font-light">
              Aucune notification
            </p>
          )}
          {list.map((n) => (
            <div
              key={n.id}
              className="group flex gap-2 px-3 py-2 border-b border-border/20 last:border-0 hover:bg-[hsl(var(--explorer-hover))]"
            >
              <span className={cn('w-1 rounded-full shrink-0', kindStyle[n.kind].replace('text-', 'bg-'))} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('text-[11px] font-normal truncate flex-1', kindStyle[n.kind])}>
                    {n.title}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60 font-mono shrink-0">{fmt(n.at)}</span>
                </div>
                {n.description && (
                  <p className="text-[10px] text-muted-foreground font-light line-clamp-2 mt-0.5">
                    {n.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => remove(n.id)}
                className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-red-500/20 hover:text-red-400 transition-opacity"
              >
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
