import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, GitBranch, Star, GitFork, ExternalLink, Loader2, AlertCircle, FileText, Folder, RefreshCw } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { loadGithubToken } from './GitHubAuthCard';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';

interface Props { owner: string; repo: string; onBack: () => void }

interface TreeItem { path: string; type: 'blob' | 'tree'; size?: number; sha: string }
interface RepoMeta { full_name: string; description: string | null; default_branch: string; stargazers_count: number; forks_count: number; html_url: string; language: string | null; private: boolean }

export function GitHubRepoDetail({ owner, repo, onBack }: Props) {
  const token = loadGithubToken();
  const [meta, setMeta] = useState<RepoMeta | null>(null);
  const [branches, setBranches] = useState<Array<{ name: string }>>([]);
  const [branch, setBranch] = useState<string>('');
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [readme, setReadme] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [dir, setDir] = useState<string>('');

  useEffect(() => {
    if (!token) { setStatus('error'); setError('Token GitHub manquant.'); return; }
    let cancelled = false;
    (async () => {
      setStatus('loading'); setError(null);
      try {
        const [m, b] = await Promise.all([
          api.githubGet<RepoMeta>(`/repos/${owner}/${repo}`, token),
          api.githubGet<Array<{ name: string }>>(`/repos/${owner}/${repo}/branches?per_page=100`, token),
        ]);
        if (cancelled) return;
        if (m.status !== 200) throw new Error((m.data as any)?.message || `HTTP ${m.status}`);
        setMeta(m.data);
        setBranches(Array.isArray(b.data) ? b.data : []);
        setBranch(m.data.default_branch);
      } catch (err) {
        if (!cancelled) { setStatus('error'); setError(err instanceof Error ? err.message : 'Erreur'); }
      }
    })();
    return () => { cancelled = true; };
  }, [owner, repo, token]);

  useEffect(() => {
    if (!token || !branch || !meta) return;
    let cancelled = false;
    (async () => {
      setStatus('loading');
      try {
        const [tr, rd] = await Promise.all([
          api.githubGet<{ tree: TreeItem[]; truncated?: boolean }>(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, token),
          api.githubGet<{ content: string; encoding: string }>(`/repos/${owner}/${repo}/readme?ref=${branch}`, token),
        ]);
        if (cancelled) return;
        setTree(Array.isArray(tr.data?.tree) ? tr.data.tree : []);
        if (rd.status === 200 && rd.data?.content) {
          try { setReadme(atob(rd.data.content.replace(/\n/g, ''))); }
          catch { setReadme(null); }
        } else setReadme(null);
        setStatus('ready');
      } catch (err) {
        if (!cancelled) { setStatus('error'); setError(err instanceof Error ? err.message : 'Erreur'); }
      }
    })();
    return () => { cancelled = true; };
  }, [owner, repo, branch, meta, token]);

  const level = useMemo(() => {
    const prefix = dir ? `${dir}/` : '';
    const seen = new Set<string>();
    const items: Array<{ name: string; path: string; type: 'blob' | 'tree'; size?: number }> = [];
    for (const t of tree) {
      if (!t.path.startsWith(prefix)) continue;
      const rest = t.path.slice(prefix.length);
      if (!rest) continue;
      const [first, ...others] = rest.split('/');
      if (seen.has(first)) continue;
      seen.add(first);
      items.push({
        name: first,
        path: prefix + first,
        type: others.length ? 'tree' : t.type,
        size: others.length ? undefined : t.size,
      });
    }
    return items.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'tree' ? -1 : 1));
  }, [tree, dir]);

  if (status === 'error') {
    return (
      <EmptyState icon={<AlertCircle size={22} />} title="Impossible d'ouvrir le dépôt"
        description={error || 'Erreur inconnue.'}
        actions={<button onClick={onBack} className="h-8 px-3 text-[12px] rounded border border-border/40 hover:bg-[hsl(var(--explorer-hover))]">Retour</button>} />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
        <button onClick={onBack} className="p-1 rounded hover:bg-[hsl(var(--explorer-hover))] text-muted-foreground hover:text-foreground" title="Retour aux dépôts">
          <ArrowLeft size={14} />
        </button>
        <div className="min-w-0">
          <h2 className="text-[13px] font-normal text-foreground font-mono truncate">{owner}/{repo}</h2>
          {meta?.description && <p className="text-[11px] text-muted-foreground font-light truncate">{meta.description}</p>}
        </div>
        <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          {meta && <>
            <span className="flex items-center gap-1"><Star size={11} /> {meta.stargazers_count}</span>
            <span className="flex items-center gap-1"><GitFork size={11} /> {meta.forks_count}</span>
            {meta.language && <span className="hidden md:inline">{meta.language}</span>}
            <a href={meta.html_url} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-[hsl(var(--explorer-hover))]" title="Ouvrir sur github.com">
              <ExternalLink size={11} />
            </a>
          </>}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <aside className="w-72 shrink-0 border-r border-border/30 flex flex-col min-h-0">
          <div className="p-2 border-b border-border/20 flex items-center gap-2">
            <GitBranch size={12} className="text-primary/80" />
            <select value={branch} onChange={(e) => { setBranch(e.target.value); setDir(''); }}
              className="flex-1 h-6 px-1 rounded bg-[hsl(var(--muted))] border border-border/30 text-[11px] font-mono">
              {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
            <button onClick={() => setBranch((b) => b)} className="p-1 rounded hover:bg-[hsl(var(--explorer-hover))]" title="Recharger">
              <RefreshCw size={11} className={status === 'loading' ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="p-2 border-b border-border/20 text-[11px] font-mono text-muted-foreground truncate">
            {dir ? (
              <button onClick={() => setDir(dir.includes('/') ? dir.slice(0, dir.lastIndexOf('/')) : '')} className="hover:text-foreground">
                ← {dir || '/'}
              </button>
            ) : <span>/</span>}
          </div>
          <div className="flex-1 overflow-auto">
            {status === 'loading' && level.length === 0 ? (
              <div className="p-4 text-[11px] text-muted-foreground flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Chargement…</div>
            ) : level.length === 0 ? (
              <div className="p-4 text-[11px] text-muted-foreground">Dossier vide</div>
            ) : level.map((it) => (
              <button key={it.path}
                onClick={() => { if (it.type === 'tree') setDir(it.path); }}
                className={cn('flex items-center gap-2 w-full px-3 py-1.5 text-[12px] font-light text-left hover:bg-[hsl(var(--explorer-hover))]',
                  it.type === 'blob' && 'opacity-90')}>
                {it.type === 'tree' ? <Folder size={12} className="text-primary/80" /> : <FileText size={12} className="text-muted-foreground" />}
                <span className="truncate font-mono">{it.name}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex-1 overflow-auto p-6 min-w-0">
          {readme ? (
            <article className="prose prose-invert max-w-none prose-sm">
              <pre className="whitespace-pre-wrap font-mono text-[12px] text-foreground/90 bg-transparent">{readme}</pre>
            </article>
          ) : (
            <EmptyState icon={<FileText size={22} />} title="Aucun README" description="Ce dépôt n'a pas de README dans cette branche." />
          )}
        </section>
      </div>
    </div>
  );
}
