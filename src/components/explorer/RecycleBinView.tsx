import { useMemo, useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { useRecycleBin } from '@/hooks/useRecycleBin';
import { HDIcon } from './icons/HDIcon';
import { getFallbackIcon } from './icons/iconFallbacks';
import { formatFileSize } from '@/data/mockFileSystem';
import { cn } from '@/lib/utils';
import { explorerToast } from './ExplorerToasts';

export function RecycleBinView() {
  const { entries, restore, purge } = useRecycleBin();
  const [selected, setSelected] = useState<string[]>([]);
  const sorted = useMemo(() => [...entries].sort((a, b) => b.deletedAt - a.deletedAt), [entries]);

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<Trash2 size={22} />}
        title="La corbeille est vide"
        description="Les éléments supprimés depuis l'explorateur apparaîtront ici. Vous pourrez les restaurer ou vider la corbeille."
      />
    );
  }

  const toggle = (id: string, e: React.MouseEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    setSelected((prev) => {
      if (!ctrl) return prev.includes(id) && prev.length === 1 ? [] : [id];
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  const doRestore = (ids: string[]) => {
    restore(ids);
    setSelected([]);
    explorerToast.success('Éléments restaurés', `${ids.length} entrée(s) retirée(s) de la corbeille`);
  };
  const doPurge = (ids?: string[]) => {
    const n = ids ? ids.length : sorted.length;
    if (!confirm(`Supprimer définitivement ${n} élément(s) ?`)) return;
    purge(ids);
    setSelected([]);
    explorerToast.info('Corbeille nettoyée', `${n} élément(s) supprimé(s)`);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[hsl(var(--muted))] border border-border/40 flex items-center justify-center">
          <Trash2 size={16} className="text-red-400/80" />
        </div>
        <div className="flex-1">
          <h2 className="text-[13px] font-normal text-foreground">Corbeille</h2>
          <p className="text-[11px] text-muted-foreground font-light">{sorted.length} élément(s) en attente</p>
        </div>
        <button onClick={() => doRestore(selected.length ? selected : sorted.map((e) => e.id))}
          className="h-7 px-3 text-[11px] rounded border border-border/40 hover:bg-[hsl(var(--explorer-hover))] flex items-center gap-1.5 disabled:opacity-40"
          disabled={sorted.length === 0}>
          <RotateCcw size={11} /> Restaurer{selected.length ? ` (${selected.length})` : ' tout'}
        </button>
        <button onClick={() => doPurge(selected.length ? selected : undefined)}
          className="h-7 px-3 text-[11px] rounded border border-red-400/30 text-red-400/90 hover:bg-red-500/10 flex items-center gap-1.5">
          <AlertTriangle size={11} /> Vider{selected.length ? ` (${selected.length})` : ''}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-[12px] font-light">
          <thead className="text-[10px] uppercase text-muted-foreground/60 tracking-wider">
            <tr className="border-b border-border/20">
              <th className="text-left px-4 py-2 font-normal">Nom</th>
              <th className="text-left px-4 py-2 font-normal">Emplacement d'origine</th>
              <th className="text-right px-4 py-2 font-normal">Taille</th>
              <th className="text-left px-4 py-2 font-normal">Supprimé</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => {
              const isSel = selected.includes(e.id);
              return (
                <tr key={e.id}
                  onClick={(ev) => toggle(e.id, ev)}
                  className={cn('cursor-pointer border-b border-border/10 hover:bg-[hsl(var(--explorer-hover))]', isSel && 'bg-[hsl(var(--explorer-selected))]')}>
                  <td className="px-4 py-2 flex items-center gap-2 min-w-0">
                    <HDIcon src={getFallbackIcon(e.type as any)} size={16} alt="" />
                    <span className="truncate text-foreground">{e.name}</span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground font-mono text-[11px] truncate max-w-[280px]" title={e.originalPath}>{e.originalPath}</td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">{e.size ? formatFileSize(e.size) : '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(e.deletedAt).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
