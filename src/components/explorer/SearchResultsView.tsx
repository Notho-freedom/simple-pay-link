import { useMemo, useState } from 'react';
import { Search, Filter, FolderOpen, FileText, Image as ImgIcon, Code2, Film, Music } from 'lucide-react';
import type { FileItem, FileType } from '@/types/fileExplorer';
import { EmptyState } from './EmptyState';
import { HDIcon } from './icons/HDIcon';
import { getFallbackIcon } from './icons/iconFallbacks';
import { formatFileSize } from '@/data/mockFileSystem';
import { cn } from '@/lib/utils';

interface Props {
  query: string;
  scope: string;
  results: FileItem[];
  onOpen: (id: string) => void;
  onNavigate: (path: string) => void;
}

const FACETS: Array<{ id: FileType | 'all'; label: string; icon: any }> = [
  { id: 'all', label: 'Tous', icon: Filter },
  { id: 'folder', label: 'Dossiers', icon: FolderOpen },
  { id: 'document', label: 'Documents', icon: FileText },
  { id: 'image', label: 'Images', icon: ImgIcon },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'video', label: 'Vidéos', icon: Film },
  { id: 'audio', label: 'Audio', icon: Music },
];

export function SearchResultsView({ query, scope, results, onOpen, onNavigate }: Props) {
  const [facet, setFacet] = useState<FileType | 'all'>('all');
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    results.forEach((r) => map.set(r.type, (map.get(r.type) || 0) + 1));
    return map;
  }, [results]);
  const filtered = useMemo(() => facet === 'all' ? results : results.filter((r) => r.type === facet), [facet, results]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2 text-[12px] font-light">
          <Search size={13} className="text-primary/80" />
          <span className="text-muted-foreground">Résultats pour</span>
          <span className="font-mono text-foreground">"{query}"</span>
          <span className="text-muted-foreground">dans</span>
          <button onClick={() => onNavigate(scope)} className="font-mono text-foreground/90 hover:text-primary truncate max-w-xs" title={scope}>{scope}</button>
          <span className="ml-auto text-muted-foreground/70 text-[11px]">{filtered.length} résultat(s)</span>
        </div>
        <div className="flex items-center gap-1 mt-3 flex-wrap">
          {FACETS.map((f) => {
            const active = facet === f.id;
            const c = f.id === 'all' ? results.length : counts.get(f.id) || 0;
            return (
              <button key={f.id} onClick={() => setFacet(f.id)} disabled={c === 0 && f.id !== 'all'}
                className={cn('flex items-center gap-1.5 px-2 h-6 rounded-full border text-[11px] transition-colors',
                  active ? 'bg-primary/15 border-primary/40 text-foreground' : 'border-border/40 text-muted-foreground hover:bg-[hsl(var(--explorer-hover))]',
                  c === 0 && f.id !== 'all' && 'opacity-30')}>
                <f.icon size={10} /> {f.label} <span className="font-mono text-[9px] opacity-70">{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="Aucun résultat"
          description={`Rien ne correspond à "${query}" dans ce dossier. Essayez un autre mot-clé ou naviguez dans un autre dossier.`}
        />
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[12px] font-light">
            <thead className="text-[10px] uppercase text-muted-foreground/60 tracking-wider">
              <tr className="border-b border-border/20">
                <th className="text-left px-4 py-2 font-normal">Nom</th>
                <th className="text-left px-4 py-2 font-normal">Chemin</th>
                <th className="text-right px-4 py-2 font-normal">Taille</th>
                <th className="text-left px-4 py-2 font-normal">Modifié</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id} onDoubleClick={() => onOpen(f.id)}
                  className="cursor-pointer border-b border-border/10 hover:bg-[hsl(var(--explorer-hover))]">
                  <td className="px-4 py-2 flex items-center gap-2 min-w-0">
                    <HDIcon src={getFallbackIcon(f.type as any)} size={16} alt="" />
                    <span className="truncate text-foreground">{f.name}</span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground font-mono text-[11px] truncate max-w-[300px]" title={f.path}>{f.path}</td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">{f.size ? formatFileSize(f.size) : '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{f.dateModified.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
