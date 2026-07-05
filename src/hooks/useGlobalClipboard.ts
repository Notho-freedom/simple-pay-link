import { useSyncExternalStore, useCallback } from 'react';
import { ClipboardState } from '@/types/fileExplorer';

let state: ClipboardState = { items: [], operation: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const globalClipboard = {
  get: () => state,
  set(next: ClipboardState) {
    state = next;
    emit();
  },
};

export function useGlobalClipboard() {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state
  );
  const copy = useCallback((items: string[]) => globalClipboard.set({ items, operation: 'copy' }), []);
  const cut = useCallback((items: string[]) => globalClipboard.set({ items, operation: 'cut' }), []);
  const clear = useCallback(() => globalClipboard.set({ items: [], operation: null }), []);
  return { clipboard: value, copy, cut, clear };
}
