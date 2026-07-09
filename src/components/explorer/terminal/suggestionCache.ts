// LRU cache for AI-suggested commands, persisted in localStorage.
// Enriches autocomplete over time.

const KEY = 'terminal.suggestions.cache.v1';
const MAX = 200;

interface Entry { cmd: string; at: number; hits: number; }

function load(): Entry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((e) => e && typeof e.cmd === 'string');
  } catch { return []; }
}

function save(entries: Entry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX))); } catch { /* ignore */ }
}

export function cacheSuggestions(cmds: string[]) {
  if (!cmds || cmds.length === 0) return;
  const entries = load();
  const map = new Map(entries.map((e) => [e.cmd, e]));
  const now = Date.now();
  for (const cmd of cmds) {
    const clean = cmd.trim();
    if (!clean || clean.length > 400) continue;
    const existing = map.get(clean);
    if (existing) { existing.at = now; existing.hits += 1; }
    else map.set(clean, { cmd: clean, at: now, hits: 1 });
  }
  // Sort: recency-weighted (recent first, hits break ties)
  const next = Array.from(map.values()).sort((a, b) => (b.at - a.at) || (b.hits - a.hits));
  save(next);
}

export function getCachedSuggestions(prefix: string, limit = 6): string[] {
  const p = (prefix || '').toLowerCase().trim();
  const entries = load();
  if (!p) return entries.slice(0, limit).map((e) => e.cmd);
  return entries
    .filter((e) => e.cmd.toLowerCase().startsWith(p) && e.cmd.toLowerCase() !== p)
    .slice(0, limit)
    .map((e) => e.cmd);
}

export function bumpSuggestionUse(cmd: string) {
  if (!cmd) return;
  const entries = load();
  const idx = entries.findIndex((e) => e.cmd === cmd);
  if (idx >= 0) {
    entries[idx].hits += 1;
    entries[idx].at = Date.now();
    save(entries);
  }
}
