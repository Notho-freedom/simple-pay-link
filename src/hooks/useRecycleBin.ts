import { useCallback, useEffect, useState } from 'react';

/**
 * Local, non-destructive recycle bin. We do NOT touch the OS recycle bin —
 * this is a UI-level record so users can restore or empty demo deletions.
 * Persisted in localStorage under `explorer.recycle.v1`.
 */
export interface RecycleEntry {
  id: string;
  name: string;
  originalPath: string;
  type: string;
  size: number;
  deletedAt: number;
}

const KEY = 'explorer.recycle.v1';

function read(): RecycleEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(list: RecycleEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent('explorer:recycle-changed'));
}

export function useRecycleBin() {
  const [entries, setEntries] = useState<RecycleEntry[]>(() => read());

  useEffect(() => {
    const sync = () => setEntries(read());
    window.addEventListener('explorer:recycle-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('explorer:recycle-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const add = useCallback((items: Omit<RecycleEntry, 'deletedAt'>[]) => {
    const now = Date.now();
    const next = [...read(), ...items.map((it) => ({ ...it, deletedAt: now }))];
    write(next);
  }, []);

  const restore = useCallback((ids: string[]) => {
    const remain = read().filter((e) => !ids.includes(e.id));
    write(remain);
  }, []);

  const purge = useCallback((ids?: string[]) => {
    if (!ids) { write([]); return; }
    const remain = read().filter((e) => !ids.includes(e.id));
    write(remain);
  }, []);

  return { entries, add, restore, purge };
}
