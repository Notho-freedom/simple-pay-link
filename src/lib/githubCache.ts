/**
 * Lightweight TTL cache for GitHub API responses.
 * Uses in-memory Map + localStorage mirror so cache survives reloads.
 */
const TTL_MS = 5 * 60_000;
const NS = 'explorer.gh.v3';
const memory = new Map<string, { time: number; data: unknown }>();

function fullKey(key: string) { return `${NS}:${key}`; }

export function readCache<T>(key: string, ttl = TTL_MS): T | null {
  const inMem = memory.get(key);
  if (inMem && Date.now() - inMem.time <= ttl) return inMem.data as T;
  try {
    const raw = localStorage.getItem(fullKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { time: number; data: T };
    if (Date.now() - parsed.time > ttl) return null;
    memory.set(key, parsed);
    return parsed.data;
  } catch { return null; }
}

export function writeCache<T>(key: string, data: T) {
  const entry = { time: Date.now(), data };
  memory.set(key, entry);
  try { localStorage.setItem(fullKey(key), JSON.stringify(entry)); } catch { /* quota */ }
}

/** SWR helper: return cached immediately (if any) and revalidate in background. */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  onFresh?: (data: T) => void,
  opts: { force?: boolean; ttl?: number } = {},
): Promise<T> {
  const cached = !opts.force ? readCache<T>(key, opts.ttl) : null;
  if (cached !== null) {
    // Revalidate in background
    fetcher().then((fresh) => { writeCache(key, fresh); onFresh?.(fresh); }).catch(() => { /* ignore */ });
    return cached;
  }
  const fresh = await fetcher();
  writeCache(key, fresh);
  return fresh;
}

export function invalidateCache(prefix: string) {
  for (const k of Array.from(memory.keys())) if (k.startsWith(prefix)) memory.delete(k);
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${NS}:${prefix}`)) localStorage.removeItem(key);
    }
  } catch { /* noop */ }
}
