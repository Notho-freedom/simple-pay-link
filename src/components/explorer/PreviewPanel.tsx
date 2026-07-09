import { motion } from 'framer-motion';
import { FileItem } from '@/types/fileExplorer';
import { FileIcon } from './FileIcon';
import { formatFileSize, fileSystem } from '@/data/mockFileSystem';
import { useI18n } from '@/i18n/LanguageContext';
import { X, Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect, useCallback } from 'react';

const PREVIEW_WIDTH_KEY = 'explorer.preview.width.v1';
const MIN_W = 220;
const MAX_W = 640;

interface Props {
  file: FileItem | null;
  displayName: string;
  onClose: () => void;
}

function buildFullPath(id: string): string {
  if (!fileSystem[id]) return id;
  const parts: string[] = [];
  let current = fileSystem[id];
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? fileSystem[current.parentId] : null;
  }
  return parts.join(' \\ ');
}

// Fake waveform component
function FakeWaveform({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-10 w-full px-1">
      {Array.from({ length: 48 }).map((_, i) => {
        const h = 20 + Math.abs(Math.sin(i * 0.7) * 60) + (i % 3) * 5;
        return (
          <div
            key={i}
            className="flex-1 rounded-sm bg-primary/60"
            style={{
              height: `${Math.min(100, h)}%`,
              opacity: playing ? 0.4 + Math.abs(Math.sin((Date.now() / 200) + i)) * 0.6 : 0.5,
              transition: 'opacity 0.2s',
            }}
          />
        );
      })}
    </div>
  );
}

export function PreviewPanel({ file, displayName, onClose }: Props) {
  const { t, locale } = useI18n();
  const [playing, setPlaying] = useState(false);
  const formatDate = (d: Date) => d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const isImage = file?.type === 'image';
  const isVideo = file?.type === 'video';
  const isAudio = file?.type === 'audio';
  const isPdf = file?.type === 'pdf';
  const previewUrl = file ? (file as FileItem & { previewUrl?: string }).previewUrl : undefined;

  // Persisted user-resized width; content-type suggests a default when the user
  // hasn't manually resized yet.
  const [width, setWidth] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem(PREVIEW_WIDTH_KEY));
      if (raw >= MIN_W && raw <= MAX_W) return raw;
    } catch { /* ignore */ }
    return 300;
  });
  const draggingRef = useRef(false);
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const next = Math.min(MAX_W, Math.max(MIN_W, startW + (startX - ev.clientX)));
      setWidth(next);
    };
    const onUp = () => {
      draggingRef.current = false;
      try { localStorage.setItem(PREVIEW_WIDTH_KEY, String(width)); } catch { /* ignore */ }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width]);
  useEffect(() => {
    try { localStorage.setItem(PREVIEW_WIDTH_KEY, String(width)); } catch { /* ignore */ }
  }, [width]);

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className="h-full border-l border-border/50 bg-[hsl(var(--explorer-surface))] overflow-y-auto shrink-0 relative"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={onDragStart}
        className="absolute top-0 left-0 h-full w-1 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 z-10"
      />
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="section-label">{t('preview.title')}</span>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" onClick={onClose}><X size={12} /></Button>
        </div>

        {!file ? (
          <p className="text-[12px] text-muted-foreground text-center mt-16 font-light">{t('preview.selectItem')}</p>
        ) : (
          <div className="space-y-4">
            {/* Preview area */}
            <div className="flex flex-col items-center py-4 rounded-lg bg-[hsl(var(--muted))]">
              {isImage && (previewUrl || file.thumbnail) ? (
                <img src={previewUrl || file.thumbnail} alt="" className="w-44 h-32 rounded object-cover" />
              ) : isVideo && previewUrl ? (
                <video src={previewUrl} controls className="w-52 max-h-36 rounded bg-black" />
              ) : isAudio && previewUrl ? (
                <div className="w-full px-3">
                  <audio src={previewUrl} controls className="w-full" />
                </div>
              ) : isPdf && previewUrl ? (
                <iframe src={previewUrl} title={displayName} className="w-52 h-40 rounded bg-background border border-border/40" />
              ) : (
                <FileIcon type={file.type} extension={file.extension} name={displayName} path={file.path} size={64} />
              )}
              <p className="text-[12px] font-normal mt-2 px-3 text-center break-all leading-tight">{displayName}</p>

              {/* Mini-players */}
              {(isAudio || isVideo) && !previewUrl && (
                <div className="w-full px-3 mt-3 space-y-2">
                  <FakeWaveform playing={playing} />
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10" onClick={() => setPlaying(p => !p)}>
                      {playing ? <Pause size={12} /> : <Play size={12} />}
                    </Button>
                    <div className="flex-1 h-1 rounded-full bg-background relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full bg-primary/70" style={{ width: playing ? '34%' : '0%', transition: 'width 0.5s' }} />
                    </div>
                    <Volume2 size={11} className="text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Properties */}
            <div className="space-y-2">
              <Row label={t('preview.type')} value={t(`filetype.${file.type}`)} />
              {file.extension && <Row label={t('preview.extension')} value={`.${file.extension}`} />}
              {file.size !== undefined && file.type !== 'folder' && <Row label={t('preview.size')} value={formatFileSize(file.size)} />}
              {file.type === 'folder' && file.children && <Row label={t('preview.contents')} value={`${file.children.length} ${t(file.children.length !== 1 ? 'status.items_plural' : 'status.items')}`} />}
              <Row label={t('preview.modified')} value={formatDate(file.dateModified)} />
              <Row label={t('preview.created')} value={formatDate(file.dateCreated)} />
              <Row label={t('preview.location')} value={file.path || file.targetPath || buildFullPath(file.id)} mono />
            </div>

            {(file.tags && file.tags.length > 0) && (
              <div>
                <p className="section-label mb-1.5">{t('preview.tags')}</p>
                <div className="flex flex-wrap gap-1">
                  {file.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-[11px] text-muted-foreground shrink-0 font-light">{label}</span>
      <span className={`text-[11px] text-right break-all leading-tight font-light ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</span>
    </div>
  );
}
