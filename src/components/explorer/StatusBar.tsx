import { FileItem } from '@/types/fileExplorer';
import { formatFileSize } from '@/data/mockFileSystem';
import { useI18n } from '@/i18n/LanguageContext';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX, Command as CommandIcon, Clipboard } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';
import { NotificationCenter } from './NotificationCenter';
import { useGlobalClipboard } from '@/hooks/useGlobalClipboard';

interface Props {
  files: FileItem[];
  selectedCount: number;
  iconSize: number;
  onIconSizeChange: (size: number) => void;
  onOpenCommandPalette: () => void;
  /** Contextual footer content (e.g. GitHub repo details). Rendered on the left, replaces the default counters. */
  contextInfo?: React.ReactNode;
}

export function StatusBar({ files, selectedCount, iconSize, onIconSizeChange, onOpenCommandPalette, contextInfo }: Props) {
  const { t } = useI18n();
  const { muted, toggleMuted, playHover } = useSound();
  const { clipboard } = useGlobalClipboard();
  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
  const folderCount = files.filter(f => f.type === 'folder').length;
  const fileCount = files.length - folderCount;

  return (
    <div className="flex items-center justify-between px-2 h-6 border-t border-border/40 bg-[hsl(var(--explorer-surface))] text-[11px] text-muted-foreground select-none font-light shrink-0">
      <div className="flex items-center gap-3 min-w-0 overflow-hidden">
        {contextInfo ? (
          contextInfo
        ) : (
          <>
            <span className="font-mono text-[10px] text-muted-foreground/60">UTF-8</span>
            <span className="font-mono text-[10px] text-muted-foreground/60">LF</span>
            <span>{folderCount} {t('status.folders')} · {fileCount} {t('status.files')}</span>
            {selectedCount > 0 && <span className="text-primary">{selectedCount} {t(selectedCount !== 1 ? 'status.selected_plural' : 'status.selected')}</span>}
            {totalSize > 0 && <span className="font-mono">{formatFileSize(totalSize)}</span>}
          </>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 w-28">
          <span className="text-[9px] opacity-60">−</span>
          <Slider
            value={[iconSize]}
            min={32}
            max={140}
            step={4}
            onValueChange={([v]) => onIconSizeChange(v)}
            className="flex-1 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_[role=slider]]:border [&>span:first-child]:h-[2px]"
          />
          <span className="text-[9px] opacity-60">+</span>
        </div>

        {clipboard.items.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70 px-1">
                <Clipboard size={10} className={clipboard.operation === 'cut' ? 'text-amber-400/80' : 'text-primary/80'} />
                <span className="font-mono">{clipboard.items.length}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>{clipboard.operation === 'cut' ? 'Couper' : 'Copier'} : {clipboard.items.length} élément(s)</p>
            </TooltipContent>
          </Tooltip>
        )}

        <NotificationCenter />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { toggleMuted(); }}
              onMouseEnter={playHover}
              className={cn('h-5 w-5 flex items-center justify-center rounded hover:bg-[hsl(var(--explorer-hover))] transition-colors', muted && 'text-muted-foreground/40')}
              aria-label="Toggle sounds"
            >
              {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs"><p>{muted ? t('status.unmute') : t('status.mute')}</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenCommandPalette}
              onMouseEnter={playHover}
              className="h-5 px-1.5 flex items-center gap-1 rounded hover:bg-[hsl(var(--explorer-hover))] transition-colors text-muted-foreground/70"
              aria-label="Command palette"
            >
              <CommandIcon size={10} />
              <span className="font-mono text-[9px]">⌘K</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs"><p>{t('toolbar.commandPalette')} (Ctrl+K)</p></TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
