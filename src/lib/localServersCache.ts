// Session-scoped cache for `getListeningServices()` results.
// TTL: 30 s. Manual invalidation via `invalidateLocalServersCache()`.

const KEY = 'explorer.localServers.v1';
const TTL_MS = 30_000;

interface Entry<T = unknown> {
  ts: number;
  data: T;
}

function read(): Entry | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry;
    if (!parsed || typeof parsed.ts !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getCachedLocalServers<T>(): T | null {
  const e = read();
  if (!e) return null;
  if (Date.now() - e.ts > TTL_MS) return null;
  return e.data as T;
}

export function setCachedLocalServers<T>(data: T) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), data } satisfies Entry<T>));
  } catch {
    /* quota — ignore */
  }
}

export function invalidateLocalServersCache() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
