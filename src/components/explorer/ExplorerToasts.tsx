// Custom themed toast tiles for the explorer.
// Replaces sonner / Lovable's default toast UI with our Midnight Indigo aesthetic.
import { useSyncExternalStore } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Loader2, GitBranch, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastKind = 'info' | 'success' | 'error' | 'warning' | 'loading' | 'git' | 'network';

export interface ExplorerToast {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  at: number;
  ttl: number; // ms; 0 = sticky
}

let toasts: ExplorerToast[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const remove = (id: string) => {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
};

export const explorerToast = {
  push(kind: ToastKind, title: string, description?: string, ttl = 3500) {
    const id = `et-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const item: ExplorerToast = { id, kind, title, description, at: Date.now(), ttl };
    toasts = [item, ...toasts].slice(0, 6);
    emit();
    if (ttl > 0) setTimeout(() => remove(id), ttl);
    return id;
  },
  success: (title: string, description?: string) => explorerToast.push('success', title, description),
  error: (title: string, description?: string) => explorerToast.push('error', title, description, 5000),
  info: (title: string, description?: string) => explorerToast.push('info', title, description),
  warning: (title: string, description?: string) => explorerToast.push('warning', title, description, 4500),
  loading: (title: string, description?: string) => explorerToast.push('loading', title, description, 0),
  git: (title: string, description?: string) => explorerToast.push('git', title, description),
  network: (title: string, description?: string) => explorerToast.push('network', title, description),
  dismiss: remove,
};

const kindIcon: Record<ToastKind, any> = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  loading: Loader2,
  git: GitBranch,
  network: Wifi,
};

const kindAccent: Record<ToastKind, string> = {
  info: 'border-l-primary text-primary',
  success: 'border-l-emerald-400 text-emerald-300',
  error: 'border-l-red-400 text-red-300',
  warning: 'border-l-amber-400 text-amber-300',
  loading: 'border-l-primary text-primary',
  git: 'border-l-violet-400 text-violet-300',
  network: 'border-l-sky-400 text-sky-300',
};

export function ExplorerToaster() {
  const list = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => toasts,
    () => toasts
  );

  if (list.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-[340px] max-w-[calc(100vw-2rem)]">
      {list.map((t) => {
        const Icon = kindIcon[t.kind];
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto group flex items-start gap-2.5 px-3 py-2.5 rounded-md border-l-2',
              'bg-[hsl(var(--explorer-surface))]/95 backdrop-blur-md border border-border/40 shadow-[0_8px_24px_-12px_rgba(79,70,229,0.4)]',
              'animate-in slide-in-from-right-4 fade-in duration-200',
              kindAccent[t.kind]
            )}
          >
            <Icon size={14} className={cn('shrink-0 mt-0.5', t.kind === 'loading' && 'animate-spin')} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-normal text-foreground leading-tight">{t.title}</p>
              {t.description && (
                <p className="text-[10.5px] text-muted-foreground font-light mt-0.5 leading-snug line-clamp-2">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-[hsl(var(--explorer-hover))] transition-opacity shrink-0"
              aria-label="Fermer"
            >
              <X size={10} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
