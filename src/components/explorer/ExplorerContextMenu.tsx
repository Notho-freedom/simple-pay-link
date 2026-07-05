import { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { CtxItem, CtxContext, buildContextMenu } from './contextMenuConfig';
import { cn } from '@/lib/utils';

interface Props {
  x: number;
  y: number;
  visible: boolean;
  ctx: CtxContext;
  onClose: () => void;
  onAction: (id: string) => void;
}

export function ExplorerContextMenu({ x, y, visible, ctx, onClose, onAction }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handler = () => onClose();
    document.addEventListener('click', handler);
    document.addEventListener('contextmenu', handler);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') onClose(); });
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('contextmenu', handler);
    };
  }, [visible, onClose]);

  useEffect(() => {
    if (!visible || !ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth) el.style.left = `${window.innerWidth - rect.width - 4}px`;
    if (rect.bottom > window.innerHeight) el.style.top = `${window.innerHeight - rect.height - 4}px`;
  }, [visible, x, y]);

  if (!visible) return null;

  const items = buildContextMenu(ctx);
  const fire = (id: string) => { onAction(id); onClose(); };

  return (
    <div
      ref={ref}
      className="fixed z-50 glass-menu rounded-lg py-1 min-w-[260px] shadow-2xl border border-border/40"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        if (item.kind === 'sep') {
          return <div key={`sep-${i}`} className="h-px bg-border/40 my-1 mx-2" />;
        }
        if (item.kind === 'header-actions') {
          return (
            <div key={`hdr-${i}`} className="flex items-center justify-around px-2 pb-1.5 pt-1 mb-1 border-b border-border/30">
              {item.items.map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.id}
                    onClick={() => fire(act.id)}
                    title={act.label}
                    className={cn(
                      'flex flex-col items-center gap-0.5 px-2.5 py-1 rounded hover:bg-[hsl(var(--explorer-hover))] transition-colors min-w-[44px]',
                      act.danger && 'text-red-400 hover:text-red-300'
                    )}
                  >
                    <Icon size={14} />
                    <span className="text-[9px] font-light leading-none mt-0.5">{act.label}</span>
                  </button>
                );
              })}
            </div>
          );
        }
        if (item.kind === 'submenu') {
          const Icon = item.icon;
          return (
            <div key={`sub-${i}`} className="relative group">
              <div className="flex items-center gap-2.5 w-full px-3 py-[5px] text-[12px] font-light hover:bg-[hsl(var(--explorer-hover))] transition-colors text-left cursor-default">
                <Icon size={14} className="text-muted-foreground/80 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight size={11} className="text-muted-foreground/60" />
              </div>
              <div className="absolute left-full top-0 ml-0.5 hidden group-hover:block glass-menu rounded-lg py-1 min-w-[220px] shadow-2xl border border-border/40">
                {item.items.map((sub) => {
                  const SubIcon = sub.icon;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => fire(sub.id)}
                      className="flex items-center gap-2.5 w-full px-3 py-[5px] text-[12px] font-light hover:bg-[hsl(var(--explorer-hover))] transition-colors text-left"
                    >
                      <SubIcon size={14} className="text-muted-foreground/80 shrink-0" />
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
        const Icon = item.icon;
        return (
          <button
            key={`item-${i}-${item.id}`}
            disabled={item.disabled}
            onClick={() => fire(item.id)}
            className={cn(
              'flex items-center gap-2.5 w-full px-3 py-[5px] text-[12px] font-light transition-colors text-left disabled:opacity-30 disabled:hover:bg-transparent',
              'hover:bg-[hsl(var(--explorer-hover))]',
              item.danger && 'text-red-400 hover:text-red-300'
            )}
          >
            <Icon size={14} className={cn('shrink-0', item.danger ? 'text-red-400' : 'text-muted-foreground/80')} />
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <span className="text-[10px] text-muted-foreground/50 font-mono">{item.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}
