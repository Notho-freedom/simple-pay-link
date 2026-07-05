import { useState } from 'react';
import { Key, ExternalLink, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { EmptyState } from './EmptyState';

const TOKEN_KEY = 'cognitive.github.pat';

export function loadGithubToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function saveGithubToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* noop */ }
}

export function clearGithubToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
}

/**
 * GitHub authentication card — Personal Access Token (PAT) flow.
 *
 * We deliberately avoid OAuth here because the whole point of the new
 * architecture is that the UI ships as a static site: no per-deployment
 * client-id / callback URL to manage. The user creates a PAT once, we store
 * it in localStorage and forward it to the local API server as a Bearer token
 * on every /api/github/* call.
 */
export function GitHubAuthCard({ onAuthenticated }: { onAuthenticated: (token: string) => void }) {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!token.trim()) return;
    setStatus('checking'); setError(null);
    try {
      const res = await api.githubGet<{ login?: string; message?: string }>('/user', token.trim());
      if (res.status === 200 && res.data.login) {
        saveGithubToken(token.trim());
        onAuthenticated(token.trim());
      } else {
        setStatus('error');
        setError(res.data.message || `Réponse GitHub inattendue (HTTP ${res.status}).`);
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Impossible de contacter GitHub.');
    }
  };

  return (
    <EmptyState
      icon={<Key size={22} />}
      title="Connecter votre compte GitHub"
      description="Collez un Personal Access Token (scope repo). Il reste stocké localement dans ce navigateur et n'est jamais partagé."
      actions={
        <div className="w-full max-w-md flex flex-col gap-2">
          <input
            type="password"
            autoFocus
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={token}
            onContextMenu={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => { setToken(e.target.value); setStatus('idle'); }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') void submit();
            }}
            className="allow-select h-8 px-2.5 text-[12px] font-mono bg-[hsl(var(--muted))] border border-border/40 rounded outline-none focus:border-primary/50"
          />
          {error && <p className="text-[11px] text-red-400 font-light text-left">{error}</p>}
          <div className="flex items-center gap-2 justify-between">
            <a
              href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=Cognitive+Explorer"
              target="_blank" rel="noreferrer"
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ExternalLink size={11} /> Créer un token
            </a>
            <button
              onClick={submit}
              disabled={!token.trim() || status === 'checking'}
              className="h-8 px-3 text-[12px] rounded bg-primary/90 text-primary-foreground hover:bg-primary transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {status === 'checking'
                ? <><Loader2 size={12} className="animate-spin" /> Vérification…</>
                : <><ShieldCheck size={12} /> Se connecter</>}
            </button>
          </div>
        </div>
      }
    />
  );
}
