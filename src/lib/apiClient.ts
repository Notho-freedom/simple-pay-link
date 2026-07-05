/**
 * Cognitive Explorer — HTTP API client.
 *
 * The UI talks to a small local API server (spawned by the Electron shell or by
 * `npm run dev:explorer:api` in web mode). The base URL can be injected at boot
 * via the query string (?apiBase=http://127.0.0.1:8081), which is how the
 * Electron shell hands system parameters to the deployed UI.
 *
 * When no apiBase is provided, we fall back to relative `/api/*` calls (dev
 * proxy in vite.config.ts) — this makes web preview + Electron indistinguishable
 * from the UI's perspective.
 */

const boot = readBootParams();

function readBootParams(): {
  apiBase: string;
  platform?: string;
  hostname?: string;
  username?: string;
  homedir?: string;
  shell?: string;
} {
  if (typeof window === 'undefined') return { apiBase: '' };
  // Params can live before OR after the hash depending on how the shell injects them.
  const search = new URLSearchParams(window.location.search);
  const afterHash = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
  const hashParams = new URLSearchParams(afterHash);
  const get = (k: string) => search.get(k) ?? hashParams.get(k) ?? undefined;
  return {
    apiBase: get('apiBase') || '',
    platform: get('platform'),
    hostname: get('hostname'),
    username: get('username'),
    homedir: get('homedir'),
    shell: get('shell'),
  };
}

export function getBootParams() { return boot; }

export function apiUrl(path: string) {
  const base = boot.apiBase || '';
  if (!path.startsWith('/')) path = `/${path}`;
  return `${base}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data || {}) }),
  del:  <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  githubGet: async <T>(subPath: string, token: string): Promise<{ status: number; data: T }> => {
    const res = await fetch(apiUrl(`/api/github${subPath.startsWith('/') ? '' : '/'}${subPath}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({} as T));
    return { status: res.status, data: data as T };
  },
  githubPut: async <T>(subPath: string, body: unknown, token: string): Promise<{ status: number; data: T }> => {
    const res = await fetch(apiUrl(`/api/github${subPath.startsWith('/') ? '' : '/'}${subPath}`), {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({} as T));
    return { status: res.status, data: data as T };
  },
};

// True when the API server is reachable (either via injected apiBase or dev proxy).
export async function pingApi(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl('/api/system/info'));
    return res.ok;
  } catch { return false; }
}
