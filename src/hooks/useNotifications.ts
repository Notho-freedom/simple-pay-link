import { useSyncExternalStore, useCallback } from 'react';

export type NotificationKind = 'info' | 'success' | 'error' | 'warning' | 'git' | 'network';

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  description?: string;
  at: number;
  read: boolean;
}

let store: Notification[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const notifications = {
  push(n: Omit<Notification, 'id' | 'at' | 'read'>) {
    const item: Notification = {
      ...n,
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      at: Date.now(),
      read: false,
    };
    store = [item, ...store].slice(0, 50);
    emit();
  },
  markAllRead() {
    store = store.map((n) => ({ ...n, read: true }));
    emit();
  },
  clear() {
    store = [];
    emit();
  },
  remove(id: string) {
    store = store.filter((n) => n.id !== id);
    emit();
  },
};

export function useNotifications() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => store,
    () => store
  );
  const unreadCount = list.filter((n) => !n.read).length;
  const push = useCallback((n: Omit<Notification, 'id' | 'at' | 'read'>) => notifications.push(n), []);
  return {
    list,
    unreadCount,
    push,
    markAllRead: notifications.markAllRead,
    clear: notifications.clear,
    remove: notifications.remove,
  };
}
