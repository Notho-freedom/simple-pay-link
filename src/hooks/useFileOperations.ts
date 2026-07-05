import { useState, useCallback, useEffect, useRef } from 'react';
import { explorerToast } from '@/components/explorer/ExplorerToasts';
import { play } from '@/lib/sounds';

export interface CopyJob {
  id: string;
  type: 'copy' | 'move' | 'delete' | 'compress' | 'extract';
  source: string[];
  destination: string;
  totalItems: number;
  totalBytes: number;
  copiedBytes: number;
  currentItem: string;
  status: 'running' | 'paused' | 'done' | 'cancelled' | 'error';
  startTime: number;
  speed: number; // bytes/s
}

const verbDone: Record<CopyJob['type'], string> = {
  copy: 'copié(s)',
  move: 'déplacé(s)',
  delete: 'supprimé(s)',
  compress: 'compressé(s)',
  extract: 'extrait(s)',
};

/** Mock long-running file operation with realistic progress simulation. */
export function useFileOperations() {
  const [jobs, setJobs] = useState<CopyJob[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const soundRef = useRef<number | null>(null);

  // Loop a soft loading tick while any job is running
  useEffect(() => {
    const anyRunning = jobs.some((j) => j.status === 'running');
    if (anyRunning && soundRef.current === null) {
      // play once immediately, then every 1.4s
      play('loading');
      soundRef.current = window.setInterval(() => play('loading'), 1400);
    } else if (!anyRunning && soundRef.current !== null) {
      window.clearInterval(soundRef.current);
      soundRef.current = null;
    }
    return () => {
      if (soundRef.current !== null) {
        window.clearInterval(soundRef.current);
        soundRef.current = null;
      }
    };
  }, [jobs]);

  const startJob = useCallback((opts: {
    type: CopyJob['type'];
    source: string[];
    destination: string;
    totalBytes?: number;
    items?: string[];
  }) => {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const totalBytes = opts.totalBytes ?? Math.max(opts.source.length * 1_500_000, 500_000);
    const items = opts.items ?? opts.source;
    const job: CopyJob = {
      id,
      type: opts.type,
      source: opts.source,
      destination: opts.destination,
      totalItems: items.length,
      totalBytes,
      copiedBytes: 0,
      currentItem: items[0] || '',
      status: 'running',
      startTime: Date.now(),
      speed: 0,
    };
    setJobs((prev) => [...prev, job]);
    setDetailOpen(true);

    // Simulate progress
    const tickMs = 80;
    const totalTime = Math.min(8000, Math.max(1500, totalBytes / 800_000));
    const step = totalBytes / (totalTime / tickMs);
    let copied = 0;
    let lastTick = Date.now();

    const interval = setInterval(() => {
      copied += step * (0.7 + Math.random() * 0.6);
      const now = Date.now();
      const dt = (now - lastTick) / 1000;
      const speed = dt > 0 ? step / dt : 0;
      lastTick = now;

      const idx = Math.min(items.length - 1, Math.floor((copied / totalBytes) * items.length));
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? {
                ...j,
                copiedBytes: Math.min(copied, totalBytes),
                currentItem: items[idx] || j.currentItem,
                speed,
              }
            : j
        )
      );

      if (copied >= totalBytes) {
        clearInterval(interval);
        setJobs((prev) =>
          prev.map((j) => (j.id === id ? { ...j, copiedBytes: totalBytes, status: 'done' as const } : j))
        );
        play('success');
        explorerToast.success(`${items.length} élément(s) ${verbDone[opts.type]}`, opts.destination);
        setTimeout(() => setDetailOpen(false), 700);
        setTimeout(() => {
          setJobs((prev) => prev.filter((j) => j.id !== id));
        }, 2500);
      }
    }, tickMs);

    return id;
  }, []);

  const cancelJob = useCallback((id: string) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'cancelled' as const } : j)));
    setTimeout(() => setJobs((prev) => prev.filter((j) => j.id !== id)), 500);
  }, []);

  const togglePause = useCallback((id: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id ? { ...j, status: j.status === 'paused' ? 'running' : ('paused' as const) } : j
      )
    );
  }, []);

  return { jobs, startJob, cancelJob, togglePause, detailOpen, setDetailOpen };
}
