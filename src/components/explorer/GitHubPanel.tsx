import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, GitPullRequest, Search, GitFork, Eye, Lock, Globe, LogOut, RefreshCw, Loader2, AlertCircle, Star, GitBranch, FileCode2, Undo2, Save, Plus, FileText, Clock } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Editor from '@monaco-editor/react';
import { useI18n } from '@/i18n/LanguageContext';
import { useSound } from '@/hooks/useSound';
import { HDIcon } from './icons/HDIcon';
import { EmptyState } from './EmptyState';
import { GitHubAuthCard, loadGithubToken, clearGithubToken } from './GitHubAuthCard';
import { GitHubAuthDialog } from './GitHubAuthDialog';
import { GitHubFileTree, TreeItem } from './GitHubFileTree';
import { explorerToast } from './ExplorerToasts';
import { api } from '@/lib/apiClient';
import { getCached, invalidateCache } from '@/lib/githubCache';
import { cn } from '@/lib/utils';
import { openContextMenu } from '@/lib/contextMenuBus';

const EXT_LANGUAGE: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  json: 'json', md: 'markdown', mdx: 'markdown', html: 'html', htm: 'html',
  css: 'css', scss: 'scss', less: 'less', py: 'python', rb: 'ruby',
  go: 'go', rs: 'rust', java: 'java', kt: 'kotlin', swift: 'swift',
  c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', cs: 'csharp', php: 'php',
  sh: 'shell', bash: 'shell', zsh: 'shell', yml: 'yaml', yaml: 'yaml',
  xml: 'xml', sql: 'sql', vue: 'html', svelte: 'html', toml: 'ini',
  ini: 'ini', dockerfile: 'dockerfile', lock: 'yaml',
};
function detectLanguage(name: string): string {
  const lower = name.toLowerCase();
  if (lower === 'dockerfile') return 'dockerfile';
  const ext = lower.split('.').pop() || '';
  return EXT_LANGUAGE[ext] || 'plaintext';
}

const GH_LOGO = 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/github.svg';
const CACHE_TTL = 5 * 60_000;

const LANGUAGE_LOGOS: Record<string, string> = {
  TypeScript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
  JavaScript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
  Python: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
  Java: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg',
  Go: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg',
  Rust: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-original.svg',
  PHP: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg',
  HTML: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
  CSS: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
  Vue: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg',
  Svelte: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/svelte/svelte-original.svg',
  Dart: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dart/dart-original.svg',
  Kotlin: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg',
  Swift: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg',
};

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  language: string | null;
  private: boolean;
  html_url: string;
  updated_at: string;
  clone_url?: string;
  ssh_url?: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
  message?: string;
}

interface RepoContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  size?: number;
  sha?: string;
  download_url?: string | null;
  html_url?: string;
}

interface CommitItem {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author?: { name?: string; date?: string };
  };
}

interface GithubCache {
  user: GitHubUser;
  repos: Repo[];
  time: number;
}

interface DetailContext {
  headerLeft: React.ReactNode;
  headerRight: React.ReactNode;
  footer: React.ReactNode;
}

interface Props {
  onNavigate: (id: string) => void;
  onDetailContextChange?: (ctx: DetailContext | null) => void;
}

function cacheKey(token: string) {
  return `explorer.github.cache.v2:${token.slice(-10)}`;
}

function readGithubCache(token: string): GithubCache | null {
  try {
    const cache = JSON.parse(localStorage.getItem(cacheKey(token)) || 'null') as GithubCache | null;
    if (!cache || Date.now() - cache.time > CACHE_TTL) return null;
    return cache;
  } catch {
    return null;
  }
}

function writeGithubCache(token: string, user: GitHubUser, repos: Repo[]) {
  try {
    localStorage.setItem(cacheKey(token), JSON.stringify({ user, repos, time: Date.now() }));
    const sorted = [...repos].sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1)).slice(0, 8);
    localStorage.setItem('explorer.github.recent', JSON.stringify({
      user: { login: user.login, avatar_url: user.avatar_url },
      repos: sorted.map((r) => ({ id: r.id, name: r.name, full_name: r.full_name, private: r.private, language: r.language, updated_at: r.updated_at, html_url: r.html_url })),
      time: Date.now(),
    }));
    window.dispatchEvent(new CustomEvent('github:recent-updated'));
  } catch { /* ignore cache */ }
}


function languageLogo(language: string | null) {
  if (!language) return GH_LOGO;
  return LANGUAGE_LOGOS[language] || GH_LOGO;
}

export function GitHubPanel({ onDetailContextChange }: Props) {
  const { t } = useI18n();
  const { play, playHover } = useSound();
  const [token, setToken] = useState<string | null>(() => loadGithubToken());
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [user, setUser] = useState<{ login: string; avatar_url: string } | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [rootTree, setRootTree] = useState<TreeItem[]>([]);
  const [repoCommits, setRepoCommits] = useState<CommitItem[]>([]);
  const [repoStatus, setRepoStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [repoError, setRepoError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ item: TreeItem; text: string; originalText: string; sha?: string } | null>(null);
  const [viewingSha, setViewingSha] = useState<string | null>(null);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [committing, setCommitting] = useState(false);

  const fetchAll = async (tk: string, opts: { force?: boolean } = {}) => {
    const cached = !opts.force ? readGithubCache(tk) : null;
    if (cached) {
      setUser({ login: cached.user.login, avatar_url: cached.user.avatar_url });
      setRepos(cached.repos);
      setStatus('idle');
      return;
    }
    setStatus('loading'); setError(null);
    try {
      const me = await api.githubGet<GitHubUser>('/user', tk);
      if (me.status !== 200) throw new Error(me.data?.message || `HTTP ${me.status}`);
      const pages: Repo[] = [];
      for (let page = 1; page <= 10; page += 1) {
        const list = await api.githubGet<Repo[]>(`/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`, tk);
        if (!Array.isArray(list.data) || list.data.length === 0) break;
        pages.push(...list.data);
        if (list.data.length < 100) break;
      }
      setUser({ login: me.data.login, avatar_url: me.data.avatar_url });
      setRepos(pages);
      writeGithubCache(tk, me.data, pages);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Impossible de charger les dépôts.');
    }
  };

  useEffect(() => { if (token) void fetchAll(token); }, [token]);

  // Listen to sidebar "open repo" requests
  useEffect(() => {
    const handler = (e: Event) => {
      const fullName = (e as CustomEvent<{ fullName?: string }>).detail?.fullName;
      if (!fullName || !repos) return;
      const repo = repos.find((r) => r.full_name === fullName);
      if (repo) openRepo(repo);
    };
    window.addEventListener('github:open-repo', handler);
    return () => window.removeEventListener('github:open-repo', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repos]);

  const filtered = useMemo(() => {
    if (!repos) return [];
    const q = search.toLowerCase();
    return repos.filter((r) => {
      const matchesSearch = `${r.full_name} ${r.description || ''} ${r.language || ''}`.toLowerCase().includes(q);
      const matchesLanguage = languageFilter === 'all' || (r.language || 'Sans langage') === languageFilter;
      const matchesVisibility = visibilityFilter === 'all' || (visibilityFilter === 'private' ? r.private : !r.private);
      return matchesSearch && matchesLanguage && matchesVisibility;
    });
  }, [languageFilter, repos, search, visibilityFilter]);

  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const repo of repos || []) counts.set(repo.language || 'Sans langage', (counts.get(repo.language || 'Sans langage') || 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [repos]);

  const disconnect = () => { clearGithubToken(); setToken(null); setRepos(null); setUser(null); setSelectedRepo(null); };

  /** Fetch a directory listing (cached). */
  const fetchDir = async (repo: Repo, path: string, ref: string): Promise<TreeItem[]> => {
    if (!token) return [];
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const key = `dir:${repo.full_name}:${ref}:${path}`;
    return getCached<TreeItem[]>(key, async () => {
      const contents = await api.githubGet<TreeItem | TreeItem[]>(
        `/repos/${repo.full_name}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`, token,
      );
      if (contents.status !== 200) throw new Error((contents.data as { message?: string }).message || `HTTP ${contents.status}`);
      const items = Array.isArray(contents.data) ? contents.data : [contents.data];
      return items;
    });
  };

  /** Load root tree + commits for a repo (uses cache). */
  const loadRepo = async (repo: Repo, ref?: string, opts: { force?: boolean } = {}) => {
    if (!token) return;
    setRepoStatus('loading');
    setRepoError(null);
    const effectiveRef = ref || repo.default_branch;
    try {
      if (opts.force) invalidateCache(`dir:${repo.full_name}:${effectiveRef}:`);
      const [root, commits] = await Promise.all([
        fetchDir(repo, '', effectiveRef),
        getCached<CommitItem[]>(`commits:${repo.full_name}:${repo.default_branch}`, async () => {
          const r = await api.githubGet<CommitItem[]>(
            `/repos/${repo.full_name}/commits?per_page=30&sha=${encodeURIComponent(repo.default_branch)}`, token,
          );
          return Array.isArray(r.data) ? r.data : [];
        }, undefined, { force: opts.force }),
      ]);
      setRootTree(root);
      setRepoCommits(commits);
      setRepoStatus('idle');
    } catch (err) {
      setRepoStatus('error');
      setRepoError(err instanceof Error ? err.message : 'Impossible de charger le dépôt.');
    }
  };

  const openRepo = (repo: Repo) => {
    play('open');
    setSelectedRepo(repo);
    setSelectedFile(null);
    setViewingSha(null);
    void loadRepo(repo);
  };

  const handleRepoAction = (actionId: string, repo: Repo) => {
    if (actionId === 'open') { openRepo(repo); return; }
    if (actionId === 'git.web') { window.open(repo.html_url, '_blank', 'noopener,noreferrer'); return; }
    if (actionId === 'copy.url') { void navigator.clipboard?.writeText(repo.clone_url || repo.html_url); explorerToast.success('URL HTTPS copiée', repo.full_name); return; }
    if (actionId === 'copy.url.ssh') { void navigator.clipboard?.writeText(repo.ssh_url || repo.html_url); explorerToast.success('URL SSH copiée', repo.full_name); return; }
    if (actionId === 'git.clone') { void navigator.clipboard?.writeText(`git clone ${repo.clone_url || repo.html_url}`); explorerToast.git('Commande clone copiée', repo.full_name); return; }
    if (actionId === 'git.pull') { explorerToast.git('Synchronisation simulée', repo.full_name); return; }
    if (actionId === 'git.branch') { explorerToast.git('Branches', repo.default_branch); return; }
    if (actionId === 'git.pr') { window.open(`${repo.html_url}/pulls`, '_blank', 'noopener,noreferrer'); return; }
    if (actionId === 'git.history') { window.open(`${repo.html_url}/commits/${repo.default_branch}`, '_blank', 'noopener,noreferrer'); return; }
    if (actionId === 'git.star') { explorerToast.git('Dépôt marqué', repo.full_name); return; }
    if (actionId === 'settings') { window.open(`${repo.html_url}/settings`, '_blank', 'noopener,noreferrer'); return; }
    explorerToast.info(`GitHub · ${actionId}`, repo.full_name);
  };

  const handleTreeAction = (actionId: string, item: TreeItem, action?: () => void) => {
    if (!selectedRepo) return;
    const encodedPath = item.path.split('/').map(encodeURIComponent).join('/');
    if (actionId === 'open') { if (item.type === 'dir') action?.(); else void openFile(item); return; }
    if (actionId === 'git.web') { window.open(`${selectedRepo.html_url}/blob/${viewingSha || selectedRepo.default_branch}/${encodedPath}`, '_blank', 'noopener,noreferrer'); return; }
    if (actionId === 'copy.path') { void navigator.clipboard?.writeText(item.path); explorerToast.success('Chemin Git copié', item.path); return; }
    if (actionId === 'copy.name') { void navigator.clipboard?.writeText(item.name); explorerToast.success('Nom copié', item.name); return; }
    if (actionId === 'git.history') { window.open(`${selectedRepo.html_url}/commits/${viewingSha || selectedRepo.default_branch}/${encodedPath}`, '_blank', 'noopener,noreferrer'); return; }
    if (actionId === 'git.download' && item.download_url) { window.open(item.download_url, '_blank', 'noopener,noreferrer'); return; }
    explorerToast.git(`GitHub · ${actionId}`, item.path);
  };

  const openCommit = (sha: string) => {
    if (!selectedRepo) return;
    play('open');
    setViewingSha(sha);
    void loadRepo(selectedRepo, sha);
  };

  const returnToHead = () => {
    if (!selectedRepo) return;
    setViewingSha(null);
    void loadRepo(selectedRepo);
  };

  const openFile = async (item: TreeItem) => {
    if (!selectedRepo || !token) return;
    play('dblclick');
    if (!item.download_url || (item.size || 0) > 512_000) {
      setSelectedFile({ item, text: 'Aucune prévisualisation disponible pour ce fichier.', originalText: '', sha: item.sha });
      return;
    }
    const key = `file:${item.sha || item.path}`;
    try {
      const text = await getCached<string>(key, async () => {
        const res = await fetch(item.download_url as string);
        return await res.text();
      });
      setSelectedFile({ item, text, originalText: text, sha: item.sha });
    } catch (err) {
      setSelectedFile({ item, text: err instanceof Error ? err.message : 'Lecture impossible.', originalText: '', sha: item.sha });
    }
  };

  const isDirty = selectedFile ? selectedFile.text !== selectedFile.originalText : false;

  const performCommit = async () => {
    if (!token || !selectedRepo || !selectedFile || !selectedFile.sha) {
      explorerToast.info('Commit impossible', 'Fichier sans SHA.');
      return;
    }
    setCommitting(true);
    try {
      const encoded = btoa(unescape(encodeURIComponent(selectedFile.text)));
      const body = {
        message: commitMessage || `Update ${selectedFile.item.name}`,
        content: encoded,
        sha: selectedFile.sha,
        branch: selectedRepo.default_branch,
      };
      const res = await api.githubPut<{ content?: { sha?: string } }>(
        `/repos/${selectedRepo.full_name}/contents/${selectedFile.item.path.split('/').map(encodeURIComponent).join('/')}`,
        body, token,
      );
      if (res.status >= 200 && res.status < 300) {
        explorerToast.success('Commit réussi', selectedFile.item.name);
        const newSha = res.data?.content?.sha;
        setSelectedFile({ ...selectedFile, originalText: selectedFile.text, sha: newSha || selectedFile.sha });
        setCommitDialogOpen(false);
        setCommitMessage('');
        invalidateCache(`file:${selectedFile.sha}`);
        invalidateCache(`commits:${selectedRepo.full_name}`);
        void loadRepo(selectedRepo, viewingSha || undefined, { force: true });
      } else {
        const msg = (res.data as { message?: string })?.message || `HTTP ${res.status}`;
        explorerToast.error('Échec du commit', msg);
      }
    } catch (err) {
      explorerToast.error('Échec du commit', err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setCommitting(false);
    }
  };

  // Publish detail-context (headerLeft + headerRight + footer) to parent
  useEffect(() => {
    if (!onDetailContextChange) return;
    if (!selectedRepo) { onDetailContextChange(null); return; }
    const headerLeft = (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => { setSelectedRepo(null); setSelectedFile(null); setViewingSha(null); }}
          className="h-6 px-1.5 text-[11px] rounded hover:bg-[hsl(var(--explorer-hover))] flex items-center gap-1 text-muted-foreground hover:text-foreground"
          title="Retour aux dépôts"
        >
          <ArrowLeft size={12} />
        </button>
        <HDIcon src={languageLogo(selectedRepo.language)} size={14} alt={selectedRepo.language || 'repo'} fallbackEmoji="📦" />
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-[11.5px] font-normal truncate max-w-[220px] cursor-default">{selectedRepo.full_name}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-md text-xs">
            <p>{selectedRepo.description || 'Aucune description.'}</p>
          </TooltipContent>
        </Tooltip>
        {viewingSha && (
          <button
            onClick={returnToHead}
            className="h-5 px-1.5 text-[9.5px] rounded border border-amber-400/40 text-amber-300 hover:bg-amber-400/10 flex items-center gap-1 font-mono"
            title="Revenir au HEAD"
          >
            <Undo2 size={9} /> @{viewingSha.slice(0, 7)}
          </button>
        )}
      </div>
    );
    const headerRight = (
      <button
        onClick={() => selectedRepo && void loadRepo(selectedRepo, viewingSha || undefined, { force: true })}
        className="p-1 rounded hover:bg-[hsl(var(--explorer-hover))] text-muted-foreground"
        title="Actualiser"
      >
        <RefreshCw size={11} className={repoStatus === 'loading' ? 'animate-spin' : ''} />
      </button>
    );
    const footer = (
      <>
        <span className="flex items-center gap-1"><GitBranch size={10} /> {selectedRepo.default_branch}</span>
        <span className="flex items-center gap-1"><Star size={10} /> {selectedRepo.stargazers_count}</span>
        <span className="flex items-center gap-1"><GitFork size={10} /> {selectedRepo.forks_count}</span>
        <span className="flex items-center gap-1"><Eye size={10} /> {selectedRepo.watchers_count}</span>
        {selectedRepo.open_issues_count > 0 && (
          <span className="flex items-center gap-1 text-amber-400"><GitPullRequest size={10} /> {selectedRepo.open_issues_count} issues</span>
        )}
        <span className="flex items-center gap-1">{selectedRepo.private ? <Lock size={10} /> : <Globe size={10} />} {selectedRepo.private ? 'Privé' : 'Public'}</span>
        {viewingSha && <span className="text-muted-foreground/70">· @{viewingSha.slice(0, 7)}</span>}
        {isDirty && <span className="text-amber-400 flex items-center gap-1">· ● modifié</span>}
      </>
    );
    onDetailContextChange({ headerLeft, headerRight, footer });
    return () => onDetailContextChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepo, viewingSha, repoStatus, isDirty]);

  if (!token) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-border/30 flex items-center gap-3">
          <HDIcon src={GH_LOGO} size={28} alt="GitHub" fallbackEmoji="🐙" />
          <div>
            <h2 className="text-[15px] font-normal">{t('github.title') || 'GitHub'}</h2>
            <p className="text-[11px] text-muted-foreground font-light">{t('github.subtitle') || 'Vos dépôts, en direct.'}</p>
          </div>
        </div>
        <GitHubAuthCard onAuthenticated={setToken} />
        <GitHubAuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} onAuthenticated={setToken} />
      </div>
    );
  }

  if (status === 'loading' && !repos) {
    return (
      <EmptyState
        icon={<Loader2 className="animate-spin" size={22} />}
        title="Chargement de vos dépôts…"
        description="Nous interrogeons GitHub avec votre token."
      />
    );
  }

  if (status === 'error') {
    return (
      <EmptyState
        icon={<AlertCircle size={22} />}
        title="Impossible de charger GitHub"
        description={error || 'Vérifiez votre token puis réessayez.'}
        actions={
          <div className="flex gap-2">
            <button onClick={() => token && fetchAll(token)} className="h-8 px-3 text-[12px] rounded border border-border/40 hover:bg-[hsl(var(--explorer-hover))] flex items-center gap-1.5">
              <RefreshCw size={11} /> Réessayer
            </button>
            <button onClick={disconnect} className="h-8 px-3 text-[12px] rounded border border-border/40 hover:bg-[hsl(var(--explorer-hover))] flex items-center gap-1.5">
              <LogOut size={11} /> Se déconnecter
            </button>
          </div>
        }
      />
    );
  }

  if (selectedRepo) {
    const editorLang = selectedFile ? detectLanguage(selectedFile.item.name) : 'plaintext';
    const editable = !!selectedFile && !viewingSha && selectedFile.originalText.length > 0;

    return (
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 min-w-0" autoSaveId="github-detail-v2">
          {/* VS Code-style tree */}
          <ResizablePanel defaultSize={22} minSize={12} maxSize={45}>
            <div className="h-full flex flex-col min-h-0 bg-[hsl(var(--explorer-surface))]">
              <div className="h-8 px-3 border-b border-border/40 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground section-label shrink-0">
                Explorateur
              </div>
              <div className="flex-1 overflow-y-auto">
                {repoStatus === 'error' ? (
                  <div className="p-6 text-[12px] text-red-300">{repoError}</div>
                ) : (
                  <GitHubFileTree
                    rootItems={rootTree}
                    loading={repoStatus === 'loading'}
                    activePath={selectedFile?.item.path}
                    loadChildren={(path) => fetchDir(selectedRepo, path, viewingSha || selectedRepo.default_branch)}
                    onOpenFile={openFile}
                    onContextMenu={(e, item, action) => openContextMenu(e, {
                      isBackground: false,
                      isGithubTreeItem: true,
                      githubItemType: item.type === 'dir' ? 'dir' : 'file',
                      file: null,
                      hasClipboard: false,
                      selectedCount: 1,
                      targetId: item.path,
                    }, (actionId) => handleTreeAction(actionId, item, action))}
                  />
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Editor (or empty state) — full remaining width */}
          <ResizablePanel defaultSize={78} minSize={30}>
            <div className="h-full flex flex-col min-w-0 min-h-0">
              <div className="h-8 shrink-0 px-3 border-b border-border/40 flex items-center gap-2 text-[11px] font-mono bg-[hsl(var(--explorer-surface))]">
                <FileCode2 size={12} className="text-muted-foreground" />
                <span className="truncate">{selectedFile ? selectedFile.item.path : 'Aucun fichier sélectionné'}</span>
                {selectedFile && <span className="ml-2 text-[9px] uppercase text-muted-foreground/70">{editorLang}</span>}
                {isDirty && <span className="text-[9px] text-amber-400">● modifié</span>}
                <div className="flex-1" />
                {repoCommits.length > 0 && (
                  <select
                    value={viewingSha || ''}
                    onChange={(e) => { const v = e.target.value; if (v) openCommit(v); else returnToHead(); }}
                    className="h-6 max-w-[260px] text-[10.5px] bg-[hsl(var(--muted))] border border-border/30 rounded px-1 outline-none focus:border-primary/40 font-mono"
                    title="Sélectionner un commit"
                  >
                    <option value="">HEAD · {selectedRepo.default_branch}</option>
                    {repoCommits.map((c) => (
                      <option key={c.sha} value={c.sha}>{c.sha.slice(0, 7)} — {c.commit.message.split('\n')[0].slice(0, 50)}</option>
                    ))}
                  </select>
                )}
                {editable && (
                  <button
                    onClick={() => setCommitDialogOpen(true)}
                    disabled={!isDirty}
                    className={cn(
                      'h-6 px-2 text-[10.5px] rounded flex items-center gap-1 border transition-colors',
                      isDirty ? 'border-primary/50 text-primary hover:bg-primary/10' : 'border-border/30 text-muted-foreground/50 cursor-not-allowed',
                    )}
                  >
                    <Save size={10} /> Commit
                  </button>
                )}
              </div>
              <div className="flex-1 min-h-0 min-w-0 relative">
                {selectedFile ? (
                  <Editor
                    height="100%"
                    width="100%"
                    theme="vs-dark"
                    language={editorLang}
                    value={selectedFile.text}
                    onChange={(v) => { if (editable) setSelectedFile({ ...selectedFile, text: v ?? '' }); }}
                    options={{
                      readOnly: !editable,
                      minimap: { enabled: true },
                      fontSize: 13,
                      lineNumbers: 'on',
                      wordWrap: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      renderWhitespace: 'selection',
                      fontFamily: 'JetBrains Mono, Menlo, monospace',
                      smoothScrolling: true,
                    }}
                    loading={<div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-[12px]"><Loader2 size={14} className="animate-spin mr-2" /> Chargement…</div>}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6 text-center">
                    <HDIcon src={GH_LOGO} size={48} alt="GitHub" fallbackEmoji="🐙" />
                    <p className="text-[13px] text-foreground/80">Aucun fichier ouvert</p>
                    <p className="text-[11.5px] font-light max-w-sm">
                      Sélectionnez un fichier dans l'arbre à gauche pour l'ouvrir dans l'éditeur.
                    </p>
                    <div className="flex items-center gap-1.5 text-[10.5px] mt-2 text-muted-foreground/70">
                      <FileText size={11} /> {rootTree.length} entrée(s) à la racine
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        <Dialog open={commitDialogOpen} onOpenChange={setCommitDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Commit sur {selectedRepo.default_branch}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <label className="text-[11px] text-muted-foreground">Message de commit</label>
              <input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={`Update ${selectedFile?.item.name || 'file'}`}
                className="allow-select h-9 px-3 text-[13px] bg-[hsl(var(--muted))] border border-border/40 rounded outline-none focus:border-primary/50"
              />
              <p className="text-[10.5px] text-muted-foreground/70 font-light">
                Cible : <span className="font-mono text-foreground/80">{selectedFile?.item.path}</span>
              </p>
            </div>
            <DialogFooter>
              <button onClick={() => setCommitDialogOpen(false)} className="h-8 px-3 text-[12px] rounded border border-border/40 hover:bg-[hsl(var(--explorer-hover))]">
                Annuler
              </button>
              <button
                onClick={() => void performCommit()}
                disabled={committing}
                className="h-8 px-3 text-[12px] rounded bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50"
              >
                {committing ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Committer
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }





  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 pt-6 pb-4 border-b border-border/30">
        <div className="flex items-center gap-3 mb-4">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.login} className="w-9 h-9 rounded-full border border-border/40" />
          ) : (
            <HDIcon src={GH_LOGO} size={32} alt="GitHub" fallbackEmoji="🐙" />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-normal text-foreground">{t('github.title') || 'GitHub'}</h2>
            <p className="text-[11px] text-muted-foreground font-light">
              Connecté en tant que <span className="font-mono text-foreground/80">{user?.login}</span>
            </p>
          </div>
          <div className="flex gap-3 text-[11px] text-muted-foreground items-center">
            <span className="flex items-center gap-1"><GitBranch size={11} className="text-primary/70" /> {repos?.length || 0} repos</span>
            <button onClick={() => setAuthDialogOpen(true)} className="p-1 rounded hover:bg-[hsl(var(--explorer-hover))]" title="Ajouter un compte">
              <Plus size={12} />
            </button>
            <button onClick={() => token && fetchAll(token, { force: true })} className="p-1 rounded hover:bg-[hsl(var(--explorer-hover))]" title="Actualiser">
              <RefreshCw size={12} className={status === 'loading' ? 'animate-spin' : ''} />
            </button>
            <button onClick={disconnect} className="p-1 rounded hover:bg-[hsl(var(--explorer-hover))]" title="Se déconnecter">
              <LogOut size={12} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-72">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input
              value={search}
              onContextMenu={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans les dépôts…"
              className="allow-select w-full h-7 pl-7 pr-2 text-[12px] font-light bg-[hsl(var(--muted))] border border-border/30 rounded outline-none focus:border-primary/40"
            />
          </div>
          {(['all', 'public', 'private'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setVisibilityFilter(value)}
              className={cn('h-7 px-2 text-[11px] rounded border border-border/40 hover:bg-[hsl(var(--explorer-hover))]', visibilityFilter === value && 'bg-primary/15 text-primary border-primary/30')}
            >
              {value === 'all' ? 'Tous' : value === 'public' ? 'Publics' : 'Privés'}
            </button>
          ))}
          <button
            onClick={() => setLanguageFilter('all')}
            className={cn('h-7 px-2 text-[11px] rounded border border-border/40 hover:bg-[hsl(var(--explorer-hover))]', languageFilter === 'all' && 'bg-primary/15 text-primary border-primary/30')}
          >
            Langages
          </button>
          {languages.map(([language, count]) => (
            <button
              key={language}
              onClick={() => setLanguageFilter(language)}
              className={cn('h-7 px-2 text-[11px] rounded border border-border/40 hover:bg-[hsl(var(--explorer-hover))] flex items-center gap-1.5', languageFilter === language && 'bg-primary/15 text-primary border-primary/30')}
            >
              <HDIcon src={languageLogo(language === 'Sans langage' ? null : language)} size={13} alt={language} fallbackEmoji="📦" />
              {language} <span className="text-muted-foreground font-mono">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<GitBranch size={22} />}
          title={search ? 'Aucun dépôt ne correspond' : 'Aucun dépôt à afficher'}
          description={search ? 'Essayez un autre terme.' : 'Créez ou rejoignez un dépôt sur github.com.'}
        />
      ) : (
        <div className="p-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => openRepo(r)}
              onContextMenu={(e) => openContextMenu(e, {
                isBackground: false,
                isGithubRepoCard: true,
                file: null,
                hasClipboard: false,
                selectedCount: 1,
                targetId: r.full_name,
              }, (actionId) => handleRepoAction(actionId, r))}
              onMouseEnter={playHover}
              className="group text-left flex flex-col gap-2 p-3 rounded-md border border-border/40 bg-[hsl(var(--explorer-surface))] hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-2">
                <HDIcon src={languageLogo(r.language)} size={18} alt={r.language || ''} fallbackEmoji="📦" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-mono text-foreground font-normal truncate">{r.full_name}</span>
                    <span className={cn(
                      'text-[9px] uppercase tracking-wider px-1.5 py-px rounded font-mono flex items-center gap-1',
                      r.private ? 'border border-amber-400/30 text-amber-400/80' : 'border border-border/40 text-muted-foreground',
                    )}>
                      {r.private ? <Lock size={8} /> : <Globe size={8} />}
                      {r.private ? 'private' : 'public'}
                    </span>
                  </div>
                  {r.description && (
                    <p className="text-[11px] text-muted-foreground font-light line-clamp-1 mt-0.5">{r.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                <span className="flex items-center gap-1"><GitBranch size={10} /> {r.default_branch}</span>
                <span className="flex items-center gap-1"><Star size={10} /> {r.stargazers_count}</span>
                <span className="flex items-center gap-1"><GitFork size={10} /> {r.forks_count}</span>
                <span className="flex items-center gap-1"><Eye size={10} /> {r.watchers_count}</span>
                {r.open_issues_count > 0 && (
                  <span className="flex items-center gap-1 text-amber-400/80"><GitPullRequest size={10} /> {r.open_issues_count}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                {r.language && <><span className="w-2 h-2 rounded-full bg-primary/60" /><span>{r.language}</span><span className="mx-1">·</span></>}
                <Clock size={9} />
                <span>{new Date(r.updated_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <GitHubAuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} onAuthenticated={setToken} />
    </div>
  );
}
