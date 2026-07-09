// Unified AI client with multi-provider fallback chain.
// Providers stored in localStorage. Auto-switch on error.
// Modes: suggest | agent | explain | chat
import { supabase } from '@/integrations/supabase/client';

export type ProviderKind = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama' | 'custom' | 'lovable';

export interface ProviderConfig {
  id: string;
  kind: ProviderKind;
  label: string;
  apiKey?: string;
  baseUrl?: string;
  models: string[];
  activeModel?: string;
  enabled: boolean;
}

export interface Prefs {
  providers: ProviderConfig[];
  order: string[]; // provider ids, priority order
  activeId?: string;
  activeModel?: string;
}

const KEY = 'terminal.ai.providers.v1';

const LOVABLE_DEFAULT: ProviderConfig = {
  id: 'lovable',
  kind: 'lovable',
  label: 'Lovable AI (fallback)',
  models: ['google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'google/gemini-2.5-flash-lite'],
  activeModel: 'google/gemini-2.5-flash',
  enabled: true,
};

export function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw) return { providers: [LOVABLE_DEFAULT], order: ['lovable'], activeId: 'lovable', activeModel: 'google/gemini-2.5-flash' };
    if (!raw.providers.find((p: ProviderConfig) => p.id === 'lovable')) {
      raw.providers.push(LOVABLE_DEFAULT);
      raw.order.push('lovable');
    }
    return raw;
  } catch {
    return { providers: [LOVABLE_DEFAULT], order: ['lovable'], activeId: 'lovable', activeModel: 'google/gemini-2.5-flash' };
  }
}

export function savePrefs(p: Prefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); window.dispatchEvent(new CustomEvent('ai-prefs-changed')); } catch { /* ignore */ }
}

export function setActive(providerId: string, model: string) {
  const p = loadPrefs();
  p.activeId = providerId;
  p.activeModel = model;
  const prov = p.providers.find((x) => x.id === providerId);
  if (prov) prov.activeModel = model;
  savePrefs(p);
}

export const DEFAULT_MODELS: Record<ProviderKind, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'o3-mini'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'],
  openrouter: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.5-flash', 'meta-llama/llama-3.3-70b-instruct'],
  ollama: ['llama3.2', 'qwen2.5-coder', 'deepseek-coder-v2', 'mistral'],
  custom: [],
  lovable: LOVABLE_DEFAULT.models,
};

export const DEFAULT_BASE_URLS: Record<ProviderKind, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  openrouter: 'https://openrouter.ai/api/v1',
  ollama: 'http://localhost:11434',
  custom: '',
  lovable: '',
};

// ── System prompts (aligned with edge function) ──────────────────
function systemFor(mode: string, profile: string): string {
  if (mode === 'agent') return `Tu es un AI Agent Terminal autonome (${profile}). Réponds UNIQUEMENT en JSON compact : {"action":"run|done|abort","command":"...","reason":"...","summary":"...","step":"..."}. action="run" par défaut. "abort" seulement en dernier recours. Jamais de commandes destructives ou interactives bloquantes.`;
  if (mode === 'explain') return `Tu es un expert shell (${profile}). Explique en 3-6 lignes claires. JSON : {"explanation":"..."}.`;
  if (mode === 'chat') return `Tu es Cognitive Assistant intégré à un terminal moderne. Réponds en français, concis (2–8 lignes). Blocs de code shell (${profile}) quand utile.`;
  return `Tu es un assistant terminal (${profile}). Propose des commandes concises, prêtes à exécuter. JSON : {"suggestions":["cmd1","cmd2"]}.`;
}

function userFor(mode: string, p: CallPayload): string {
  if (mode === 'agent') {
    return `OBJECTIF : ${p.goal}
CWD : ${p.cwd}
ITÉRATION : ${p.iteration}
${p.projectContext ? `CONTEXTE :\n${p.projectContext}\n` : ''}
DERNIÈRE COMMANDE : ${p.lastCommand || '(aucune)'}
CODE : ${p.lastCode ?? 0}
SORTIE :
${(p.lastOutput || '(vide)').slice(-1800)}
${p.recoverFromError ? `\n⚠ ERREUR IA PRÉCÉDENTE : ${p.recoverFromError} — adapte ton plan.` : ''}
Décide de la prochaine action.`;
  }
  if (mode === 'explain') return `Commande : ${p.prompt}`;
  if (mode === 'chat') {
    const msgs = p.messages && p.messages.length ? p.messages : [{ role: 'user', content: p.prompt || '' }];
    return msgs.map((m) => `${m.role === 'user' ? 'Utilisateur' : 'Assistant'} : ${m.content}`).join('\n\n');
  }
  return `cwd: ${p.cwd}
historique : ${(p.history || []).slice(-5).join(' | ')}
dernière commande : ${p.lastCommand || ''}
objectif : ${p.prompt || ''}
sortie :
${(p.lastOutput || '').slice(-1000)}`;
}

export interface CallPayload {
  mode: 'suggest' | 'agent' | 'explain' | 'chat';
  profile?: string;
  cwd?: string;
  history?: string[];
  lastCommand?: string;
  lastOutput?: string;
  lastCode?: number;
  prompt?: string;
  goal?: string;
  iteration?: number;
  projectContext?: string;
  messages?: { role: string; content: string }[];
  recoverFromError?: string;
}

export interface CallResult {
  raw: string;
  suggestions?: string[];
  action?: string;
  command?: string;
  reason?: string;
  summary?: string;
  step?: string;
  explanation?: string;
  reply?: string;
  providerId: string;
  model: string;
}

const wantsJson = (mode: string) => mode !== 'chat';

// ── Provider callers (browser-side, direct) ──────────────────────
async function callOpenAICompat(baseUrl: string, apiKey: string, model: string, system: string, user: string, json: boolean): Promise<string> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callAnthropic(apiKey: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model, max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.content?.[0]?.text || '';
}

async function callGemini(baseUrl: string, apiKey: string, model: string, system: string, user: string, json: boolean): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: json ? { responseMimeType: 'application/json' } : {},
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
}

async function callOllama(baseUrl: string, model: string, system: string, user: string, json: boolean): Promise<string> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      ...(json ? { format: 'json' } : {}),
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.message?.content || '';
}

async function callLovable(payload: CallPayload): Promise<string> {
  const { data, error } = await supabase.functions.invoke('terminal-suggest', { body: payload });
  if (error) throw new Error(error.message || 'edge function error');
  // repack to a raw JSON string for uniform parsing
  return JSON.stringify(data);
}

async function callSingleProvider(prov: ProviderConfig, model: string, payload: CallPayload): Promise<string> {
  const system = systemFor(payload.mode, payload.profile || 'bash');
  const user = userFor(payload.mode, payload);
  const json = wantsJson(payload.mode);

  switch (prov.kind) {
    case 'openai':
      return callOpenAICompat(prov.baseUrl || DEFAULT_BASE_URLS.openai, prov.apiKey || '', model, system, user, json);
    case 'anthropic':
      return callAnthropic(prov.apiKey || '', model, system, user);
    case 'gemini':
      return callGemini(prov.baseUrl || DEFAULT_BASE_URLS.gemini, prov.apiKey || '', model, system, user, json);
    case 'openrouter':
      return callOpenAICompat(prov.baseUrl || DEFAULT_BASE_URLS.openrouter, prov.apiKey || '', model, system, user, json);
    case 'ollama':
      return callOllama(prov.baseUrl || DEFAULT_BASE_URLS.ollama, model, system, user, json);
    case 'custom':
      return callOpenAICompat(prov.baseUrl || '', prov.apiKey || '', model, system, user, json);
    case 'lovable':
      return callLovable(payload);
  }
}

// Parse raw model output into structured result
function parseResult(raw: string, mode: string, providerId: string, model: string): CallResult {
  const res: CallResult = { raw, providerId, model };
  if (mode === 'chat') { res.reply = raw; return res; }
  if (providerId === 'lovable') {
    // Lovable already returns parsed JSON as string
    try {
      const j = JSON.parse(raw);
      Object.assign(res, j);
      return res;
    } catch { /* fallthrough */ }
  }
  let cleaned = raw.trim();
  // Strip code fences ```json ... ```
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();
  try {
    const j = JSON.parse(cleaned);
    if (Array.isArray(j.suggestions)) res.suggestions = j.suggestions.filter((s: unknown) => typeof s === 'string').slice(0, 6);
    if (typeof j.action === 'string') res.action = j.action;
    if (typeof j.command === 'string') res.command = j.command;
    if (typeof j.reason === 'string') res.reason = j.reason;
    if (typeof j.summary === 'string') res.summary = j.summary;
    if (typeof j.step === 'string') res.step = j.step;
    if (typeof j.explanation === 'string') res.explanation = j.explanation;
  } catch {
    if (mode === 'explain') res.explanation = raw;
    if (mode === 'chat') res.reply = raw;
  }
  return res;
}

export interface CallOptions {
  onSwitch?: (from: string, to: string, err: string) => void;
  timeoutMs?: number;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), ms); });
  try { return await Promise.race([p, timeout]); } finally { clearTimeout(timer!); }
}

export async function callAI(payload: CallPayload, opts: CallOptions = {}): Promise<CallResult> {
  const prefs = loadPrefs();
  // Build ordered chain: active first, then rest in `order`, then any remaining.
  const chain: { p: ProviderConfig; model: string }[] = [];
  const seen = new Set<string>();
  const push = (id?: string) => {
    if (!id || seen.has(id)) return;
    const p = prefs.providers.find((x) => x.id === id);
    if (!p || !p.enabled) return;
    const model = (p.id === prefs.activeId && prefs.activeModel) ? prefs.activeModel : (p.activeModel || p.models[0]);
    if (!model) return;
    // Skip providers missing credentials (except ollama/lovable)
    if (!['ollama', 'lovable'].includes(p.kind) && !p.apiKey) return;
    chain.push({ p, model });
    seen.add(id);
  };
  push(prefs.activeId);
  for (const id of prefs.order) push(id);
  for (const p of prefs.providers) push(p.id);

  if (!chain.length) throw new Error('Aucun fournisseur IA configuré.');

  let lastErr: Error | null = null;
  for (let i = 0; i < chain.length; i++) {
    const { p, model } = chain[i];
    try {
      const raw = await withTimeout(callSingleProvider(p, model, payload), opts.timeoutMs ?? 45000);
      return parseResult(raw, payload.mode, p.id, model);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastErr = new Error(`${p.label} (${model}) : ${msg}`);
      const next = chain[i + 1];
      if (opts.onSwitch && next) opts.onSwitch(p.label, next.p.label, msg);
    }
  }
  throw lastErr || new Error('Tous les fournisseurs IA ont échoué.');
}

// Test a single provider config (returns short status message)
export async function testProvider(prov: ProviderConfig, model: string): Promise<{ ok: boolean; message: string }> {
  try {
    const raw = await withTimeout(callSingleProvider(prov, model, {
      mode: 'suggest', profile: 'bash', cwd: '~', history: [], lastCommand: '', lastOutput: '', prompt: 'test connection: reply with {"suggestions":["ok"]}',
    }), 15000);
    return { ok: true, message: raw.slice(0, 120) };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'erreur' };
  }
}

// Fetch model list from provider (best-effort)
export async function fetchModels(prov: ProviderConfig): Promise<string[]> {
  try {
    if (prov.kind === 'openai' || prov.kind === 'openrouter' || prov.kind === 'custom') {
      const res = await fetch(`${(prov.baseUrl || DEFAULT_BASE_URLS[prov.kind]).replace(/\/$/, '')}/models`, {
        headers: { Authorization: `Bearer ${prov.apiKey}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || data.models || []).map((m: { id?: string; name?: string }) => m.id || m.name || '').filter(Boolean);
    }
    if (prov.kind === 'ollama') {
      const res = await fetch(`${(prov.baseUrl || DEFAULT_BASE_URLS.ollama).replace(/\/$/, '')}/api/tags`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map((m: { name?: string }) => m.name || '').filter(Boolean);
    }
    if (prov.kind === 'gemini') {
      const res = await fetch(`${(prov.baseUrl || DEFAULT_BASE_URLS.gemini).replace(/\/$/, '')}/models?key=${encodeURIComponent(prov.apiKey || '')}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map((m: { name?: string }) => (m.name || '').replace(/^models\//, '')).filter(Boolean);
    }
    // Anthropic: pas d'endpoint public de listing, on garde la liste par défaut.
    return DEFAULT_MODELS[prov.kind];
  } catch { return []; }
}

export function makeProviderId(kind: ProviderKind): string {
  return `${kind}-${Math.random().toString(36).slice(2, 8)}`;
}
