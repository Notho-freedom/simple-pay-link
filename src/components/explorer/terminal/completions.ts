import { COMMANDS, findCommand, findFlag } from './commandCatalog';
import { getCachedSuggestions } from './suggestionCache';
import { api } from '@/lib/apiClient';

export interface Suggestion {
  value: string;
  hint?: string;
  source: 'history' | 'catalog' | 'flag' | 'output' | 'fs' | 'ai';
}

interface Options {
  input: string;
  history: string[];
  outputTokens: string[];
  cwd: string;
}

/**
 * Compute local suggestions synchronously. FS suggestions come from
 * `fetchFsCompletions` below asynchronously.
 */
export function computeSuggestions({ input, history, outputTokens }: Options): Suggestion[] {
  const out: Suggestion[] = [];
  const parts = input.split(/\s+/);
  const head = parts[0] || '';
  const tail = parts[parts.length - 1] || '';
  const isFirst = parts.length <= 1;

  // 1. History (prefix)
  const seen = new Set<string>();
  for (let i = history.length - 1; i >= 0 && out.length < 5; i--) {
    const h = history[i];
    if (input && h.startsWith(input) && h !== input && !seen.has(h)) {
      seen.add(h);
      out.push({ value: h, source: 'history' });
    }
  }

  // 2. Cached AI suggestions (persisted across sessions)
  if (input) {
    for (const cmd of getCachedSuggestions(input, 4)) {
      if (!seen.has(cmd)) { seen.add(cmd); out.push({ value: cmd, hint: 'cache IA', source: 'ai' }); }
    }
  }

  // 3. Command catalog
  if (isFirst && head) {
    for (const c of findCommand(head)) {
      if (!seen.has(c.name)) {
        seen.add(c.name);
        out.push({ value: c.name, hint: c.desc, source: 'catalog' });
      }
    }
  }

  // 3. Flags of current command
  if (!isFirst && tail.startsWith('-')) {
    for (const flag of findFlag(head, tail)) {
      const cand = input.slice(0, input.lastIndexOf(tail)) + flag;
      if (!seen.has(cand)) {
        seen.add(cand);
        out.push({ value: cand, hint: `flag ${flag}`, source: 'flag' });
      }
    }
  }

  // 4. Output tokens matching tail
  if (!isFirst && tail && tail.length >= 2) {
    for (const tok of outputTokens) {
      if (tok.toLowerCase().startsWith(tail.toLowerCase()) && tok !== tail) {
        const cand = input.slice(0, input.lastIndexOf(tail)) + tok;
        if (!seen.has(cand)) {
          seen.add(cand);
          out.push({ value: cand, hint: 'sortie précédente', source: 'output' });
          if (out.length >= 12) break;
        }
      }
    }
  }

  return out.slice(0, 10);
}

const fsCache = new Map<string, { at: number; items: string[] }>();

export async function fetchFsCompletions(cwd: string, prefix: string): Promise<string[]> {
  const key = `${cwd}::${prefix}`;
  const now = Date.now();
  const cached = fsCache.get(key);
  if (cached && now - cached.at < 30_000) return cached.items;
  try {
    const res = await api.post<{ success: boolean; items: string[] }>('/api/fs/complete', { cwd, prefix });
    const items = (res.success && res.items) ? res.items : [];
    fsCache.set(key, { at: now, items });
    return items;
  } catch {
    return [];
  }
}
