import { Plus, X, Minus, Square, X as XIcon, TerminalSquare } from 'lucide-react';
import { HDIcon } from './icons/HDIcon';
import { resolveIconUrl, locationIcons } from './icons/iconRegistry';
import { fileSystem } from '@/data/mockFileSystem';
import { cn } from '@/lib/utils';
import { useSound } from '@/hooks/useSound';

export interface TabState {
  id: string;
  folderId: string; // current folder of this tab (unused when kind='terminal')
  kind?: 'explorer' | 'terminal';
  cwdName?: string;
  cwdPath?: string;
  sessionKey?: string;
}

interface Props {
  tabs: TabState[];
  activeId: string;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

function tabLabel(tab: TabState) {
  if (tab.kind === 'terminal') return tab.cwdPath ? `Terminal · ${tab.cwdPath.split(/[\\/]/).filter(Boolean).pop() || tab.cwdPath}` : 'Terminal';
  const item = fileSystem[tab.folderId];
  return item?.name || 'Ce PC';
}

function tabIconUrl(tab: TabState): string {
  if (tab.kind === 'terminal') return '';
  const item = fileSystem[tab.folderId];
  if (!item) return locationIcons.thisPC;
  if (tab.folderId === 'root') return locationIcons.thisPC;
  if (tab.folderId === 'network-root') return locationIcons.network;
  if (tab.folderId === 'recycle-bin') return locationIcons.trashEmpty;
  if (tab.folderId === 'mobile-root') return locationIcons.phone;
  return resolveIconUrl({ type: item.type, name: item.name, extension: item.extension });
}

export function TabBar({ tabs, activeId, onActivate, onClose, onNew }: Props) {
  const { play, playHover } = useSound();
  const windowControls = typeof window !== 'undefined' ? (window as any).cognitiveWindow : null;

  return (
    <div className="flex items-center h-9 bg-[hsl(220_24%_3%)] border-b border-border/40 select-none pl-2" style={{ WebkitAppRegion: 'drag' } as any}>
      <div className="flex items-end h-full flex-1 min-w-0 gap-0.5 overflow-x-auto scrollbar-none">
        {tabs.map(tab => {
          const active = tab.id === activeId;
          return (
            <div
              key={tab.id}
              onMouseEnter={playHover}
              onClick={() => { play('click'); onActivate(tab.id); }}
              className={cn(
                'group flex items-center gap-1.5 h-7 px-2.5 pr-1 rounded-t-md text-[12px] font-light cursor-default min-w-[120px] max-w-[200px] transition-colors',
                active
                  ? 'bg-[hsl(var(--explorer-surface))] text-foreground border-t border-l border-r border-border/40'
                  : 'text-muted-foreground hover:bg-[hsl(var(--explorer-hover))] hover:text-foreground'
              )}
              style={{ WebkitAppRegion: 'no-drag' } as any}
            >
              {tab.kind === 'terminal'
                ? <TerminalSquare size={12} className="text-emerald-400/80 shrink-0" />
                : <HDIcon src={tabIconUrl(tab)} size={13} alt="" fallbackEmoji="📁" />}
              <span className="truncate flex-1">{tabLabel(tab)}</span>
              {tabs.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); play('tab-close'); onClose(tab.id); }}
                  className="opacity-0 group-hover:opacity-100 hover:bg-[hsl(var(--explorer-hover))] rounded-sm p-0.5 transition-opacity"
                  aria-label="Close tab"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={() => { play('tab-new'); onNew(); }}
          onMouseEnter={playHover}
          className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] rounded transition-colors mb-0.5 ml-0.5"
          aria-label="New tab"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Window controls (mock) */}
      <div className="flex items-center h-full shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={() => windowControls?.minimize?.()}
          onMouseEnter={playHover}
          className="h-9 w-11 flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] transition-colors"
          aria-label="Minimize"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => windowControls?.maximize?.()}
          onMouseEnter={playHover}
          className="h-9 w-11 flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] transition-colors"
          aria-label="Maximize"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => windowControls?.close?.()}
          onMouseEnter={playHover}
          className="h-9 w-11 flex items-center justify-center text-muted-foreground/70 hover:text-white hover:bg-destructive transition-colors"
          aria-label="Close"
        >
          <XIcon size={13} />
        </button>
      </div>
    </div>
  );
}
