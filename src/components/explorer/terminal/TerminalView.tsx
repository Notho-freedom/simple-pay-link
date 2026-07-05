import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { openContextMenu } from '@/lib/contextMenuBus';
import { api } from '@/lib/apiClient';
import { openStream, StreamHandle } from '@/lib/sse';
import { highlight, HL_CLASS } from './highlight';
import { tokenize, TOK_CLASS, Tok } from './tokenize';
import { computeSuggestions, fetchFsCompletions, Suggestion } from './completions';
import { COMMANDS } from './commandCatalog';
import type { ShellProfile } from './TerminalHeader';
import { play as playSound } from '@/lib/sounds';
import { Sparkles, Loader2, Square } from 'lucide-react';

export interface TerminalViewProps {
  id: string;
  initialCwd: string;
  profile: ShellProfile;
  active: boolean;
  onFocus: () => void;
  onClose?: () => void;
  aiEnabled: boolean;
  soundEnabled: boolean;
  registerClear?: (fn: () => void) => void;
  registerCopyAll?: (fn: () => string) => void;
  registerFocusInput?: (fn: () => void) => void;
}

type LineKind = 'cmd' | 'out' | 'err' | 'sys';

interface Line {
  kind: LineKind;
  text: string;
  prompt?: string;
  durationMs?: number;
  status?: 'ok' | 'err' | 'running';
}

const HISTORY_KEY = 'terminal.history.v2';

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(h: string[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-5000))); } catch { /* ignore */ }
}

function playIf(sound: boolean, name: Parameters<typeof playSound>[0]) {
  if (sound) playSound(name);
}

export function TerminalView(props: TerminalViewProps) {
  const [lines, setLines] = useState<Line[]>([
    { kind: 'sys', text: `— ${props.profile.toUpperCase()} · terminal cognitif — tape "help" ou Ctrl+Espace pour l'autocomplétion.` },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>(() => loadHistory());
  const [histIdx, setHistIdx] = useState<number>(-1);
  const [cwd, setCwd] = useState(props.initialCwd);
  const [running, setRunning] = useState(false);
  const [runStart, setRunStart] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestIdx, setSuggestIdx] = useState(0);
  const [ghost, setGhost] = useState('');
  const [aiChips, setAiChips] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [findMode, setFindMode] = useState(false);
  const [findQuery, setFindQuery] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<StreamHandle | null>(null);
  const focusTrigger = useRef<number>(0);

  useEffect(() => {
    if (props.active) inputRef.current?.focus();
  }, [props.active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines, aiChips]);

  useEffect(() => { saveHistory(history); }, [history]);

  useEffect(() => {
    props.registerClear?.(() => setLines([]));
    props.registerCopyAll?.(() =>
      lines.map((l) => (l.kind === 'cmd' ? `${l.prompt} ${l.text}` : l.text)).join('\n'),
    );
    props.registerFocusInput?.(() => { focusTrigger.current++; inputRef.current?.focus(); });
  }, [props, lines]);

  const promptText = useMemo(() => {
    if (props.profile === 'powershell') return `PS ${cwd}>`;
    if (props.profile === 'cmd') return `${cwd}>`;
    if (props.profile === 'node') return `node>`;
    if (props.profile === 'python') return `>>>`;
    return `${cwd} $`;
  }, [cwd, props.profile]);

  // Compute the last output tokens for autocomplete "output" source
  const outputTokens = useMemo(() => {
    const set = new Set<string>();
    for (let i = lines.length - 1; i >= 0 && i > lines.length - 30; i--) {
      const l = lines[i];
      if (l.kind !== 'out') continue;
      for (const tok of tokenize(l.text)) {
        if (['dir', 'file', 'path', 'url', 'ip', 'pid'].includes(tok.kind)) {
          set.add(tok.text);
        }
      }
    }
    return Array.from(set).slice(0, 200);
  }, [lines]);

  const appendLine = useCallback((line: Line) => setLines((prev) => [...prev, line]), []);
  const appendChunk = useCallback((text: string, kind: LineKind = 'out') => {
    if (!text) return;
    setLines((prev) => {
      // Merge onto the last streaming line of the same kind
      const last = prev[prev.length - 1];
      if (last && last.kind === kind && last.status !== 'ok' && last.status !== 'err' && last.kind !== 'cmd') {
        const merged = { ...last, text: last.text + text };
        return [...prev.slice(0, -1), merged];
      }
      return [...prev, { kind, text }];
    });
  }, []);

  const executeShell = useCallback((raw: string) => {
    return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
      const started = Date.now();
      let stdoutAcc = '';
      let stderrAcc = '';
      setRunning(true);
      setRunStart(started);
      playIf(props.soundEnabled, 'click');

      // Prime an empty output line so streaming appends into it.
      setLines((prev) => [...prev, { kind: 'out', text: '', status: 'running' }]);

      const handle = openStream('/api/terminal/stream', {
        cwd,
        command: raw,
        profile: props.profile,
      }, {
        onEvent: (ev) => {
          if (ev.type === 'data' && ev.chunk) {
            stdoutAcc += ev.chunk;
            appendChunk(ev.chunk, 'out');
          } else if (ev.type === 'err' && ev.chunk) {
            stderrAcc += ev.chunk;
            appendChunk(ev.chunk, 'err');
          } else if (ev.type === 'end') {
            const dur = Date.now() - started;
            setRunning(false);
            setLines((prev) => prev.map((l, i) =>
              i === prev.length - 1 && l.status === 'running'
                ? { ...l, status: (ev.code === 0 ? 'ok' : 'err'), durationMs: dur }
                : l,
            ));
            playIf(props.soundEnabled, ev.code === 0 ? 'success' : 'error');
            resolve({ code: ev.code ?? 0, stdout: stdoutAcc, stderr: stderrAcc });
          }
        },
        onError: async () => {
          // SSE unavailable → fallback on non-streaming exec.
          try {
            const result = await api.post<{ success: boolean; stdout?: string; stderr?: string; code?: number }>('/api/terminal/exec', {
              cwd, command: raw,
            });
            if (result.stdout) appendChunk(result.stdout, 'out');
            if (result.stderr) appendChunk(result.stderr, 'err');
            const dur = Date.now() - started;
            setRunning(false);
            setLines((prev) => prev.map((l, i) =>
              i === prev.length - 1 && l.status === 'running'
                ? { ...l, status: result.success ? 'ok' : 'err', durationMs: dur }
                : l,
            ));
            resolve({ code: result.code ?? (result.success ? 0 : 1), stdout: result.stdout || '', stderr: result.stderr || '' });
          } catch {
            const dur = Date.now() - started;
            appendChunk('[erreur] API terminal indisponible', 'err');
            setRunning(false);
            setLines((prev) => prev.map((l, i) =>
              i === prev.length - 1 && l.status === 'running'
                ? { ...l, status: 'err', durationMs: dur }
                : l,
            ));
            resolve({ code: 1, stdout: '', stderr: 'api unavailable' });
          }
        },
      });
      streamRef.current = handle;
    });
  }, [appendChunk, cwd, props.profile, props.soundEnabled]);

  const requestAiSuggestions = useCallback(async (lastCmd: string, tail: string) => {
    if (!props.aiEnabled) return;
    setAiLoading(true);
    setAiChips([]);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase.functions.invoke('terminal-suggest', {
        body: {
          history: history.slice(-8),
          lastCommand: lastCmd,
          lastOutput: tail.slice(-1200),
          cwd,
          profile: props.profile,
        },
      });
      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setAiChips(data.suggestions.filter((s: unknown) => typeof s === 'string').slice(0, 3));
      }
    } catch { /* silent */ }
    setAiLoading(false);
  }, [props.aiEnabled, history, cwd, props.profile]);

  const exec = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    setLines((prev) => [...prev, { kind: 'cmd', text: raw, prompt: promptText }]);
    if (!cmd) return;
    setHistory((prev) => [...prev, cmd]);
    setHistIdx(-1);
    setAiChips([]);

    if (cmd === 'clear' || cmd === 'cls') {
      setLines([]);
      return;
    }
    if (cmd === 'exit') {
      props.onClose?.();
      return;
    }
    if (cmd === 'help') {
      appendLine({ kind: 'sys', text: 'Commandes internes : clear/cls, exit, help. Tout le reste passe au shell réel.' });
      appendLine({ kind: 'sys', text: 'Astuce : Tab accepte le ghost text, Ctrl+Espace ouvre les suggestions, clique un élément de sortie pour l\'insérer.' });
      return;
    }

    // cd tracked to keep cwd in sync (still executes on the shell).
    const result = await executeShell(cmd);
    if (/^cd(\s|$)/.test(cmd)) {
      // Query real cwd
      try {
        const r = await api.post<{ success: boolean; stdout?: string }>('/api/terminal/exec', {
          cwd, command: props.profile === 'powershell' ? '(Get-Location).Path' : 'pwd',
        });
        if (r.success && r.stdout?.trim()) setCwd(r.stdout.trim());
      } catch { /* ignore */ }
    }

    requestAiSuggestions(cmd, result.stdout + '\n' + result.stderr);
  }, [appendLine, cwd, exec_dep(promptText, executeShell, props), executeShell, promptText, props, requestAiSuggestions]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function exec_dep(..._x: any[]) { return null; }

  // Compute suggestions + ghost text on each input change
  useEffect(() => {
    const local = computeSuggestions({ input, history, outputTokens, cwd });
    setSuggestions(local);
    setSuggestIdx(0);
    setGhost(local[0] && local[0].value.startsWith(input) && local[0].value !== input ? local[0].value.slice(input.length) : '');

    // Async FS completions if the current tail looks like a path
    const parts = input.split(/\s+/);
    const tail = parts[parts.length - 1];
    if (parts.length > 1 && tail && /[\\/.~]/.test(tail)) {
      fetchFsCompletions(cwd, tail).then((items) => {
        if (items.length === 0) return;
        setSuggestions((prev) => {
          const seen = new Set(prev.map((s) => s.value));
          const extra: Suggestion[] = [];
          for (const it of items) {
            const cand = input.slice(0, input.lastIndexOf(tail)) + it;
            if (!seen.has(cand)) extra.push({ value: cand, hint: 'fs', source: 'fs' });
            if (extra.length >= 6) break;
          }
          return [...prev, ...extra].slice(0, 12);
        });
      });
    }
  }, [input, history, outputTokens, cwd]);

  const acceptGhost = () => {
    if (!ghost) return;
    setInput((prev) => prev + ghost);
    setGhost('');
  };

  const insertToken = useCallback((text: string) => {
    setInput((prev) => {
      const needsSpace = prev.length > 0 && !/\s$/.test(prev);
      return prev + (needsSpace ? ' ' : '') + text;
    });
    inputRef.current?.focus();
    playIf(props.soundEnabled, 'click');
  }, [props.soundEnabled]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestOpen && suggestions[suggestIdx]) {
        setInput(suggestions[suggestIdx].value);
        setSuggestOpen(false);
        return;
      }
      exec(input);
      setInput('');
      setGhost('');
      setSuggestOpen(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (ghost) acceptGhost();
      else if (suggestions[0]) setInput(suggestions[0].value);
    } else if (e.key === 'ArrowRight' && ghost && (e.currentTarget.selectionStart ?? 0) === input.length) {
      e.preventDefault();
      acceptGhost();
    } else if (e.key === 'ArrowUp') {
      if (suggestOpen) {
        e.preventDefault();
        setSuggestIdx((i) => (i - 1 + suggestions.length) % Math.max(1, suggestions.length));
        return;
      }
      e.preventDefault();
      const next = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setInput(history[next] || '');
    } else if (e.key === 'ArrowDown') {
      if (suggestOpen) {
        e.preventDefault();
        setSuggestIdx((i) => (i + 1) % Math.max(1, suggestions.length));
        return;
      }
      e.preventDefault();
      if (histIdx < 0) return;
      const next = histIdx + 1;
      if (next >= history.length) { setHistIdx(-1); setInput(''); }
      else { setHistIdx(next); setInput(history[next]); }
    } else if (e.key === 'Escape') {
      setSuggestOpen(false);
      setGhost('');
    } else if (e.key === ' ' && e.ctrlKey) {
      e.preventDefault();
      setSuggestOpen(true);
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setLines([]);
    } else if (e.key === 'c' && e.ctrlKey && running) {
      e.preventDefault();
      streamRef.current?.abort();
      appendLine({ kind: 'err', text: '^C interrupted' });
      setRunning(false);
    } else if (e.key === 'f' && e.ctrlKey) {
      e.preventDefault();
      setFindMode(true);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full w-full bg-[hsl(var(--background))] transition-all relative',
        props.active && 'ring-1 ring-primary/40 ring-inset',
      )}
      onMouseDown={props.onFocus}
    >
      <div
        ref={scrollRef}
        onClick={(e) => {
          // Do not steal focus if user is selecting text
          if (window.getSelection()?.toString()) return;
          inputRef.current?.focus();
        }}
        onContextMenu={(e) => openContextMenu(e, {
          isBackground: false, isTerminal: true,
          file: null, hasClipboard: false, selectedCount: 0, targetId: props.id,
        }, async (id) => {
          if (id === 'term.copy') {
            const sel = window.getSelection()?.toString();
            if (sel) navigator.clipboard?.writeText(sel);
          } else if (id === 'term.paste') {
            try { const txt = await navigator.clipboard.readText(); setInput((prev) => prev + txt); inputRef.current?.focus(); } catch { /* ignore */ }
          } else if (id === 'term.clear') setLines([]);
          else if (id === 'term.close') props.onClose?.();
          else if (id === 'term.kill') { streamRef.current?.abort(); setRunning(false); }
          else if (id === 'term.find') setFindMode(true);
        })}
        className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-[1.5] cursor-text allow-select thin-scrollbar"
        role="log"
        aria-live="polite"
      >
        {findMode && (
          <div className="sticky top-0 z-10 mb-1 flex items-center gap-1 bg-[hsl(var(--explorer-surface))] border border-border/40 rounded px-2 py-1 animate-fade-in">
            <input
              autoFocus
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setFindMode(false); setFindQuery(''); } }}
              placeholder="Rechercher…"
              className="flex-1 bg-transparent outline-none text-[11px] allow-select"
            />
            <button onClick={() => { setFindMode(false); setFindQuery(''); }} className="text-[10px] text-muted-foreground hover:text-foreground">Fermer</button>
          </div>
        )}

        {lines.map((l, i) => (
          <LineRow key={i} line={l} findQuery={findQuery} onInsertToken={insertToken} />
        ))}

        {/* AI chips */}
        {(aiLoading || aiChips.length > 0) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 animate-fade-in">
            <Sparkles size={10} className="text-primary" />
            {aiLoading && <span className="text-[10px] text-muted-foreground italic">L'IA réfléchit…</span>}
            {aiChips.map((chip, i) => (
              <button
                key={i}
                onClick={() => { setInput(chip); inputRef.current?.focus(); playIf(props.soundEnabled, 'click'); }}
                className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all hover:scale-105 animate-slide-in-right"
                style={{ animationDelay: `${i * 60}ms` }}
                title="Cliquer pour insérer"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Prompt line */}
        <div className="flex items-center relative mt-0.5">
          <StatusDot running={running} />
          <span className="shrink-0 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            {promptText}&nbsp;
          </span>
          <div className="flex-1 relative">
            {/* Highlight mirror */}
            <div className="absolute inset-0 pointer-events-none whitespace-pre overflow-hidden font-mono text-[11px]">
              {highlight(input).map((t, i) => (
                <span key={i} className={HL_CLASS[t.kind]}>{t.text}</span>
              ))}
              {ghost && <span className="text-muted-foreground/40 italic">{ghost}</span>}
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); playIf(props.soundEnabled, 'hover'); }}
              onKeyDown={onKey}
              onFocus={props.onFocus}
              spellCheck={false}
              autoComplete="off"
              disabled={running}
              className="relative bg-transparent outline-none w-full font-mono text-[11px] text-transparent caret-primary allow-select disabled:opacity-70"
              aria-autocomplete="list"
            />

            {/* Suggestion popup */}
            {suggestOpen && suggestions.length > 0 && (
              <div className="absolute left-0 top-5 z-20 glass-menu rounded-lg py-1 min-w-[260px] max-w-[420px] shadow-2xl border border-border/40 animate-scale-in">
                {suggestions.map((s, i) => (
                  <button
                    key={s.value + i}
                    onMouseDown={(e) => { e.preventDefault(); setInput(s.value); setSuggestOpen(false); inputRef.current?.focus(); }}
                    className={cn(
                      'w-full text-left px-2.5 py-1 text-[11px] flex items-center gap-2 font-mono',
                      i === suggestIdx ? 'bg-primary/15 text-foreground' : 'hover:bg-[hsl(var(--explorer-hover))]',
                    )}
                  >
                    <span className="flex-1 truncate">{s.value}</span>
                    {s.hint && <span className="text-[9px] text-muted-foreground/70 shrink-0">{s.hint}</span>}
                    <span className="text-[9px] text-muted-foreground/50 shrink-0">{s.source}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {running && (
            <button
              onClick={() => { streamRef.current?.abort(); setRunning(false); appendLine({ kind: 'err', text: '^C interrupted' }); }}
              className="ml-2 shrink-0 flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 animate-fade-in"
              title="Interrompre (Ctrl+C)"
            >
              <Square size={9} /> stop
            </button>
          )}
          {running && !streamRef.current && <Loader2 size={10} className="ml-2 animate-spin text-primary" />}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ running }: { running: boolean }) {
  return (
    <span
      className={cn(
        'inline-block w-1.5 h-1.5 rounded-full mr-1.5 shrink-0',
        running ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400',
      )}
    />
  );
}

function LineRow({ line, findQuery, onInsertToken }: { line: Line; findQuery: string; onInsertToken: (t: string) => void }) {
  const barCls =
    line.status === 'ok' ? 'bg-emerald-400/60' :
    line.status === 'err' ? 'bg-red-400/70' :
    line.status === 'running' ? 'bg-amber-400/70 animate-pulse' :
    'bg-transparent';

  if (line.kind === 'cmd') {
    return (
      <div className="flex items-start gap-1.5 animate-fade-in">
        <span className={cn('w-0.5 self-stretch rounded-full mt-0.5', barCls)} />
        <div className="flex-1 whitespace-pre-wrap break-all">
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{line.prompt} </span>
          {highlight(line.text).map((t, i) => (
            <span key={i} className={HL_CLASS[t.kind]}>{t.text}</span>
          ))}
          {typeof line.durationMs === 'number' && (
            <span className={cn(
              'ml-2 text-[9px] font-mono',
              line.durationMs > 10_000 ? 'text-red-400/80' :
              line.durationMs > 1000 ? 'text-amber-400/80' :
              'text-emerald-400/80',
            )}>
              {line.durationMs < 1000 ? `${line.durationMs} ms` : `${(line.durationMs / 1000).toFixed(2)} s`}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (line.kind === 'sys') {
    return (
      <div className="text-muted-foreground/60 italic text-[10px] py-0.5 animate-fade-in">{line.text}</div>
    );
  }

  const isErr = line.kind === 'err';
  // Split by lines so each output "row" gets tokenized independently
  const rows = line.text.split('\n');
  return (
    <div className={cn('whitespace-pre-wrap break-all', isErr && 'text-red-400/90')}>
      {rows.map((row, ri) => {
        const toks = tokenize(row);
        return (
          <div key={ri} className="animate-fade-in">
            {toks.map((t, ti) => (
              <TokenSpan key={ti} tok={t} findQuery={findQuery} onInsert={onInsertToken} err={isErr} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TokenSpan({ tok, findQuery, onInsert, err }: { tok: Tok; findQuery: string; onInsert: (t: string) => void; err: boolean }) {
  const clickable = tok.insert && tok.kind !== 'text';
  const highlighted = findQuery && tok.text.toLowerCase().includes(findQuery.toLowerCase());
  const cls = clickable ? TOK_CLASS[tok.kind] : (err ? '' : TOK_CLASS.text);
  return (
    <span
      className={cn(cls, highlighted && 'bg-yellow-400/40 text-foreground rounded')}
      onClick={clickable ? (e) => { e.stopPropagation(); onInsert(tok.insert); } : undefined}
      title={clickable ? 'Cliquer pour ajouter à la commande' : undefined}
    >
      {tok.text}
    </span>
  );
}
