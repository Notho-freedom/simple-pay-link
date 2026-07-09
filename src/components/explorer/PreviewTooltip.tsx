import { ReactNode, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileItem } from '@/types/fileExplorer';
import { FileIcon } from './FileIcon';
import { formatFileSize } from '@/data/mockFileSystem';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  file: FileItem;
  delayDuration?: number;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Contextual preview tooltip triggered on hover of a file cell. Routing by
 * extension: image → thumb, video → poster+preload, audio → controls,
 * html → sandboxed iframe, code → mono block, pdf → embed, others → icon+meta.
 * Delay 500ms, scale-in 120ms.
 */
export function PreviewTooltip({ children, file, delayDuration = 500, side = 'right' }: Props) {
  const [loaded, setLoaded] = useState(false);
  const previewUrl = (file as FileItem & { previewUrl?: string }).previewUrl;
  const ext = (file.extension || '').toLowerCase();

  const kind: 'image' | 'video' | 'audio' | 'html' | 'code' | 'pdf' | 'text' | 'other' =
    file.type === 'image' ? 'image'
    : file.type === 'video' ? 'video'
    : file.type === 'audio' ? 'audio'
    : file.type === 'pdf' ? 'pdf'
    : ext === 'html' || ext === 'htm' ? 'html'
    : file.type === 'code' ? 'code'
    : file.type === 'text' ? 'text'
    : 'other';

  const width = kind === 'image' ? 320 : kind === 'video' ? 360 : kind === 'code' ? 420 : kind === 'html' ? 400 : kind === 'pdf' ? 320 : 260;

  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={8}
        className={cn(
          'p-0 border border-border/60 bg-[hsl(var(--popover))]/95 backdrop-blur-xl shadow-2xl rounded-lg overflow-hidden',
          'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 duration-[120ms]',
        )}
        style={{ width }}
      >
        <div className="bg-[hsl(var(--muted))]/40 flex items-center justify-center min-h-[120px]">
          {kind === 'image' && previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              onLoad={() => setLoaded(true)}
              className={cn('max-h-[220px] w-full object-contain transition-opacity duration-200', loaded ? 'opacity-100' : 'opacity-0')}
            />
          ) : kind === 'video' && previewUrl ? (
            <video src={previewUrl} muted autoPlay loop preload="metadata" className="w-full max-h-[220px] bg-black" />
          ) : kind === 'audio' && previewUrl ? (
            <div className="w-full p-3">
              <audio src={previewUrl} controls className="w-full h-8" />
            </div>
          ) : kind === 'html' && previewUrl ? (
            <iframe src={previewUrl} sandbox="" title={file.name} className="w-full h-[220px] bg-background" />
          ) : kind === 'pdf' && previewUrl ? (
            <embed src={previewUrl} type="application/pdf" className="w-full h-[240px]" />
          ) : (
            <div className="p-4">
              <FileIcon type={file.type} extension={file.extension} name={file.name} path={file.path} size={72} />
            </div>
          )}
        </div>
        <div className="px-2.5 py-1.5 flex flex-col gap-0.5">
          <div className="text-[12px] font-medium text-foreground truncate">{file.name}</div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 font-light">
            <span>{file.type}{file.extension ? ` · .${file.extension}` : ''}</span>
            {file.size !== undefined && file.type !== 'folder' && <span className="font-mono">{formatFileSize(file.size)}</span>}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
