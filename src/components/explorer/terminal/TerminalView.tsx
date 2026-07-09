import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { openContextMenu } from '@/lib/contextMenuBus';
import { api } from '@/lib/apiClient';
import { openStream, StreamHandle } from '@/lib/sse';
import { highlight, HL_CLASS } from './highlight';
import { tokenize, TOK_CLASS, Tok } from './tokenize';
import { computeSuggestions, fetchFsCompletions, Suggestion } from './completions';
import { cacheSuggestions, bumpSuggestionUse } from './suggestionCache';
import { COMMANDS } from './commandCatalog';
import type { ShellProfile } from './TerminalHeader';
import { play as playSound, playKey } from '@/lib/sounds';
import { NpmSpinner } from './NpmSpinner';
import { Square } from 'lucide-react';
import { assessDanger } from './agent/dangerous';
import { AgentSteps, type AgentStep } from './agent/AgentSteps';
import { ConfirmDangerousDialog } from './agent/ConfirmDangerousDialog';
import { callAI } from '@/lib/aiProviders';

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
  registerRunAgent?: (fn: (goal: string) => Promise<void>) => void;
  registerChatAI?: (fn: (text: string, history: { role: string; content: string }[]) => Promise<string>) => void;
  sessionKey?: string;
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

interface SavedTerminalState { lines?: Line[]; cwd?: string; input?: string; }

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(h: string[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-5000))); } catch { /* ignore */ }
}

function loadTerminalState(key?: string): SavedTerminalState | null {
  if (!key) return null;
  try { return JSON.parse(localStorage.getItem(`terminal.context.${key}`) || 'null'); } catch { return null; }
}

function saveTerminalState(key: string | undefined, state: SavedTerminalState) {
  if (!key) return;
  try { localStorage.setItem(`terminal.context.${key}`, JSON.stringify({ ...state, lines: state.lines?.slice(-600) })); } catch { /* ignore */ }
}

function playIf(sound: boolean, name: Parameters<typeof playSound>[0]) {
  if (sound) playSound(name);
}

export function TerminalView(props: TerminalViewProps) {
  const saved = useMemo(() => loadTerminalState(props.sessionKey), [props.sessionKey]);
  const [lines, setLines] = useState<Line[]>(saved?.lines?.length ? saved.lines : [
    { kind: 'sys', text: `— ${props.profile.toUpperCase()} · terminal cognitif — tape "help" ou Ctrl+Espace pour l'autocomplétion.` },
  ]);
  const [input, setInput] = useState(saved?.input || '');
  const [history, setHistory] = useState<string[]>(() => loadHistory());
  const [histIdx, setHistIdx] = useState<number>(-1);
  const [cwd, setCwd] = useState(saved?.cwd || props.initialCwd);
  const [running, setRunning] = useState(false);
  const [runStart, setRunStart] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestIdx, setSuggestIdx] = useState(0);
  const [ghost, setGhost] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<Suggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingLabel, setAiLoadingLabel] = useState('IA analyse la sortie…');
  const [autoLoop, setAutoLoop] = useState<{ active: boolean; iter: number; goal: string } | null>(null);
  const autoAbortRef = useRef(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [dangerPrompt, setDangerPrompt] = useState<{ command: string; reason: string; resolve: (ok: boolean) => void } | null>(null);
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
  }, [lines, aiSuggestions, aiLoading]);

  useEffect(() => { saveHistory(history); }, [history]);
  useEffect(() => { saveTerminalState(props.sessionKey, { lines, cwd, input }); }, [props.sessionKey, lines, cwd, input]);

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
              l.status === 'running'
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
              l.status === 'running'
                ? { ...l, status: result.success ? 'ok' : 'err', durationMs: dur }
                : l,
            ));
            resolve({ code: result.code ?? (result.success ? 0 : 1), stdout: result.stdout || '', stderr: result.stderr || '' });
          } catch {
            const dur = Date.now() - started;
            appendChunk('[erreur] API terminal indisponible', 'err');
            setRunning(false);
            setLines((prev) => prev.map((l, i) =>
              l.status === 'running'
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

  const requestAiSuggestions = useCallback(async (lastCmd: string, tail: string, prompt?: string) => {
    if (!props.aiEnabled) return;
    setAiLoading(true);
    setAiLoadingLabel(prompt ? 'IA construit la commande…' : 'IA analyse la sortie…');
    setAiSuggestions([]);
    try {
      const res = await callAI({
        mode: 'suggest',
        history: history.slice(-8),
        lastCommand: lastCmd,
        lastOutput: tail.slice(-1200),
        prompt,
        cwd,
        profile: props.profile,
      }, {
        onSwitch: (from, to, err) => {
          appendLine({ kind: 'sys', text: `↻ IA : ${from} indisponible (${err.slice(0, 80)}), bascule → ${to}` });
        },
      });
      const rawCmds = res.suggestions || [];
      if (rawCmds.length) {
        cacheSuggestions(rawCmds);
        const next = rawCmds.map((value: string) => ({ value, hint: prompt ? 'commande proposée' : 'suite probable', source: 'ai' as const }));
        setAiSuggestions(next);
        setSuggestOpen(true);
        setSuggestIdx(0);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    } catch (err) {
      appendLine({ kind: 'err', text: `IA indisponible : ${err instanceof Error ? err.message : 'erreur'}` });
    }
    setAiLoading(false);
  }, [props.aiEnabled, history, cwd, props.profile, appendLine]);

  const explainCommand = useCallback(async (target: string) => {
    if (!props.aiEnabled) { appendLine({ kind: 'err', text: 'IA désactivée — ré-active-la dans la barre du terminal.' }); return; }
    setAiLoading(true);
    setAiLoadingLabel('IA explique la commande…');
    try {
      const res = await callAI({ mode: 'explain', prompt: target, cwd, profile: props.profile }, {
        onSwitch: (from, to, err) => appendLine({ kind: 'sys', text: `↻ ${from} → ${to} (${err.slice(0, 60)})` }),
      });
      const explanation = (res.explanation || '').trim();
      if (explanation) explanation.split('\n').forEach((l: string) => appendLine({ kind: 'sys', text: `  ${l}` }));
      else appendLine({ kind: 'err', text: 'IA n\'a rien renvoyé.' });
    } catch (err) {
      appendLine({ kind: 'err', text: `IA indisponible : ${err instanceof Error ? err.message : 'erreur'}` });
    }
    setAiLoading(false);
  }, [appendLine, props.aiEnabled, cwd, props.profile]);

  const askDanger = useCallback((command: string, reason: string) => new Promise<boolean>((resolve) => {
    setDangerPrompt({ command, reason, resolve });
  }), []);

  const detectProject = useCallback(async (dir: string): Promise<string> => {
    try {
      const r = await api.get<{ success: boolean; items?: Array<{ name: string; type: string }> }>(`/api/fs/list?path=${encodeURIComponent(dir)}`);
      if (!r.success || !r.items) return '';
      const names = new Set(r.items.map((it) => it.name.toLowerCase()));
      const hints: string[] = [];
      if (names.has('package.json')) hints.push('Node/JS (package.json)');
      if (names.has('bun.lockb') || names.has('bun.lock')) hints.push('Bun (bun.lock)');
      if (names.has('pnpm-lock.yaml')) hints.push('pnpm');
      if (names.has('yarn.lock')) hints.push('Yarn');
      if (names.has('cargo.toml')) hints.push('Rust (Cargo.toml)');
      if (names.has('pyproject.toml') || names.has('requirements.txt') || names.has('setup.py')) hints.push('Python');
      if (names.has('makefile')) hints.push('Makefile');
      if (names.has('go.mod')) hints.push('Go');
      if (names.has('pom.xml')) hints.push('Maven/Java');
      if (names.has('build.gradle') || names.has('build.gradle.kts')) hints.push('Gradle');
      if (names.has('composer.json')) hints.push('PHP/Composer');
      if (names.has('dockerfile')) hints.push('Docker');
      if (names.has('vite.config.ts') || names.has('vite.config.js')) hints.push('Vite');
      const files = r.items.filter((it) => it.type === 'file').slice(0, 40).map((it) => it.name).join(', ');
      const dirs = r.items.filter((it) => it.type === 'directory').slice(0, 20).map((it) => it.name).join(', ');
      return `Techno détectée : ${hints.join(', ') || 'inconnue'}\nFichiers : ${files}\nDossiers : ${dirs}`;
    } catch { return ''; }
  }, []);

  const updateStep = useCallback((id: string, patch: Partial<AgentStep>) => {
    setAgentSteps((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
  }, []);
  const addStep = useCallback((step: AgentStep) => {
    setAgentSteps((prev) => [...prev, step]);
  }, []);

  const runAgentLoop = useCallback(async (goal: string) => {
    if (!props.aiEnabled) { appendLine({ kind: 'err', text: 'IA désactivée — impossible de lancer --auto.' }); return; }
    autoAbortRef.current = false;
    setAutoLoop({ active: true, iter: 0, goal });
    setAgentSteps([
      { id: 'understand', label: 'Compréhension de l\'objectif', status: 'running', detail: goal },
      { id: 'detect', label: 'Détection du projet', status: 'pending' },
    ]);

    // 1. Detect project
    const projectContext = await detectProject(cwd);
    updateStep('understand', { status: 'ok' });
    updateStep('detect', { status: projectContext ? 'ok' : 'ok', detail: projectContext.split('\n')[0] || 'contexte minimal' });

    const MAX_ITER = 20;
    let lastCmd = '';
    let lastOut = '';
    let lastCode = 0;
    let successiveFailures = 0;
    let aiErrorStreak = 0; // fournisseurs IA en chaîne d'échec

    for (let i = 1; i <= MAX_ITER; i++) {
      if (autoAbortRef.current) { appendLine({ kind: 'err', text: '⏹ AUTO interrompu (Ctrl+C)' }); break; }
      setAutoLoop({ active: true, iter: i, goal });
      const stepId = `iter-${i}`;
      addStep({ id: stepId, label: `Itération ${i}`, status: 'running', detail: 'Décision en cours…' });
      setAiLoading(true);
      setAiLoadingLabel(`Agent · itération ${i}/${MAX_ITER}`);

      let decision: { action: string; command?: string; reason?: string; summary?: string; step?: string } = { action: 'abort' };
      let recoverFromError: string | undefined;
      let iaOk = false;
      try {
        const res = await callAI({
          mode: 'agent',
          goal, cwd, profile: props.profile,
          lastCommand: lastCmd,
          lastOutput: lastOut.slice(-1800),
          lastCode,
          iteration: i,
          projectContext,
          recoverFromError,
        }, {
          onSwitch: (from, to, err) => {
            appendLine({ kind: 'sys', text: `↻ IA : ${from} indisponible → bascule vers ${to} (${err.slice(0, 80)})` });
          },
        });
        decision = {
          action: res.action || 'abort',
          command: res.command,
          reason: res.reason,
          summary: res.summary,
          step: res.step,
        };
        iaOk = true;
        aiErrorStreak = 0;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'erreur inconnue';
        aiErrorStreak += 1;
        updateStep(stepId, { status: 'error', detail: `Tous fournisseurs IA en échec : ${msg}` });
        appendLine({ kind: 'err', text: `⚠ agent · IA HS (essai ${aiErrorStreak}/3) — ${msg}` });
        if (aiErrorStreak >= 3) {
          appendLine({ kind: 'err', text: '⏹ AGENT : 3 échecs IA consécutifs, abandon. Ajoute un fournisseur dans les paramètres.' });
          break;
        }
        // Re-tente la même itération après un court délai — l'auto-switch dans callAI a déjà tourné.
        await new Promise((r) => setTimeout(r, 1500));
        i -= 1; // rejouer l'itération
        setAiLoading(false);
        continue;
      }
      setAiLoading(false);
      if (!iaOk) continue;


      const label = decision.step || `Itération ${i}`;
      updateStep(stepId, { label, detail: decision.command || decision.reason || decision.summary || '' });

      if (decision.action === 'done') {
        updateStep(stepId, { status: 'ok', label: 'Objectif atteint' });
        appendLine({ kind: 'sys', text: `✔ AGENT terminé : ${decision.summary || decision.reason || 'objectif atteint'}` });
        playIf(props.soundEnabled, 'success');
        break;
      }
      if (decision.action === 'abort' || !decision.command) {
        updateStep(stepId, { status: 'error', label: 'Abandon', detail: decision.reason || 'raison inconnue' });
        appendLine({ kind: 'err', text: `⏹ AGENT abandonne : ${decision.reason || 'raison inconnue'}` });
        playIf(props.soundEnabled, 'error');
        break;
      }

      // Danger gate
      const danger = assessDanger(decision.command);
      if (danger.dangerous) {
        updateStep(stepId, { detail: `⚠ ${danger.reason} — confirmation…` });
        const ok = await askDanger(decision.command, danger.reason || 'Commande sensible');
        if (!ok) {
          updateStep(stepId, { status: 'error', detail: 'Refusée par l\'utilisateur' });
          appendLine({ kind: 'err', text: '⏹ AGENT : commande refusée par l\'utilisateur.' });
          break;
        }
      }

      // Exécution
      cacheSuggestions([decision.command]);
      setLines((prev) => [...prev, { kind: 'cmd', text: decision.command!, prompt: promptText }]);
      const result = await executeShell(decision.command);
      lastCmd = decision.command;
      lastOut = (result.stdout || '') + '\n' + (result.stderr || '');
      lastCode = result.code;
      if (result.code === 0) {
        successiveFailures = 0;
        updateStep(stepId, { status: 'ok' });
      } else {
        successiveFailures += 1;
        updateStep(stepId, { status: 'error', detail: `code ${result.code} · tentative de correction` });
        if (successiveFailures >= 3) {
          appendLine({ kind: 'err', text: '⏹ AGENT : 3 échecs consécutifs, abandon.' });
          break;
        }
      }
    }

    setAutoLoop(null);
    setAiLoading(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [appendLine, cwd, executeShell, props.aiEnabled, props.profile, props.soundEnabled, promptText, detectProject, updateStep, addStep, askDanger]);

  const chatWithAI = useCallback(async (text: string, msgHistory: { role: string; content: string }[]): Promise<string> => {
    const res = await callAI({
      mode: 'chat',
      messages: [...msgHistory, { role: 'user', content: text }],
      cwd,
      profile: props.profile,
    });
    return (res.reply || res.raw || '').trim();
  }, [cwd, props.profile]);

  // Register agent + chat callables for parent (TerminalPanel chat pane)
  useEffect(() => {
    props.registerRunAgent?.(runAgentLoop);
    props.registerChatAI?.(chatWithAI);
  }, [props, runAgentLoop, chatWithAI]);

  const changeDirectory = useCallback(async (target: string) => {
    try {
      const r = await api.post<{ success: boolean; cwd?: string; error?: string }>('/api/terminal/cwd', { cwd, target });
      if (r.success && r.cwd) {
        setCwd(r.cwd);
        appendLine({ kind: 'sys', text: `cwd → ${r.cwd}` });
        playIf(props.soundEnabled, 'success');
      } else {
        appendLine({ kind: 'err', text: r.error || `cd: ${target}: dossier introuvable` });
        playIf(props.soundEnabled, 'error');
      }
    } catch (err) {
      appendLine({ kind: 'err', text: err instanceof Error ? err.message : 'cd impossible' });
    }
  }, [appendLine, cwd, props.soundEnabled]);

  const printHelp = useCallback(() => {
    const lines: Array<{ kind: LineKind; text: string }> = [
      { kind: 'sys', text: '── Terminal cognitif · commandes internes ──' },
      { kind: 'sys', text: '' },
      { kind: 'sys', text: '  Navigation' },
      { kind: 'sys', text: '    cd <dossier>              change de dossier (accepte ~, .., chemins absolus)' },
      { kind: 'sys', text: '    ls / dir                  liste le contenu (passe au shell réel)' },
      { kind: 'sys', text: '    pwd                       affiche le dossier courant' },
      { kind: 'sys', text: '' },
      { kind: 'sys', text: '  Fichiers' },
      { kind: 'sys', text: '    mkdir <nom>               crée un dossier' },
      { kind: 'sys', text: '    touch / New-Item <nom>    crée un fichier vide' },
      { kind: 'sys', text: '    rm / cp / mv              supprime, copie, déplace' },
      { kind: 'sys', text: '' },
      { kind: 'sys', text: '  Assistant IA (Lovable AI Gateway)' },
      { kind: 'sys', text: '    ia <prompt>               propose 1–5 commandes candidates' },
      { kind: 'sys', text: '    ia --auto <objectif>      boucle autonome : exécute + corrige jusqu\'à atteindre l\'objectif' },
      { kind: 'sys', text: '    ia --explain <commande>   explique ce que fait une commande' },
      { kind: 'sys', text: '    ia --fix                  propose la correction pour la dernière erreur' },
      { kind: 'sys', text: '' },
      { kind: 'sys', text: '  Terminal' },
      { kind: 'sys', text: '    clear / cls               efface la vue' },
      { kind: 'sys', text: '    help                      affiche cette aide' },
      { kind: 'sys', text: '    exit                      ferme la vue' },
      { kind: 'sys', text: '' },
      { kind: 'sys', text: '  Raccourcis clavier' },
      { kind: 'sys', text: '    Tab / →                   accepte le ghost text (fantôme gris)' },
      { kind: 'sys', text: '    Ctrl+Espace               ouvre la liste des suggestions' },
      { kind: 'sys', text: '    ↑ / ↓                     historique · navigation dans les suggestions' },
      { kind: 'sys', text: '    Ctrl+L                    efface la vue' },
      { kind: 'sys', text: '    Ctrl+C                    interrompt une commande / une boucle AUTO' },
      { kind: 'sys', text: '    Ctrl+F                    rechercher dans le buffer' },
      { kind: 'sys', text: '' },
      { kind: 'sys', text: '  Astuce · clique un chemin, une IP, un nom de fichier ou un hash pour l\'insérer.' },
    ];
    setLines((prev) => [...prev, ...lines]);
  }, []);

  const lastErrorRef = useRef<{ cmd: string; out: string } | null>(null);

  const exec = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    setLines((prev) => [...prev, { kind: 'cmd', text: raw, prompt: promptText }]);
    if (!cmd) return;
    setHistory((prev) => [...prev, cmd]);
    setHistIdx(-1);
    setAiSuggestions([]);

    if (cmd === 'clear' || cmd === 'cls') {
      setLines([]);
      return;
    }
    if (cmd === 'exit') {
      props.onClose?.();
      return;
    }
    if (cmd === 'help' || cmd === '?') {
      printHelp();
      return;
    }

    if (/^cd(?:\s|$)/i.test(cmd)) {
      await changeDirectory(cmd.replace(/^cd(?:\s+)?/i, ''));
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    // ── IA scopes ──
    const iaMatch = /^(?:ia|ai|@ai|\?)\s+(.+)$/i.exec(cmd);
    if (iaMatch) {
      const rest = iaMatch[1].trim();
      // --auto <goal>
      const autoMatch = /^--?auto\s+(.+)$/i.exec(rest);
      if (autoMatch) { await runAgentLoop(autoMatch[1].trim()); return; }
      // --explain <cmd>
      const explainMatch = /^--?explain\s+(.+)$/i.exec(rest);
      if (explainMatch) { await explainCommand(explainMatch[1].trim()); return; }
      // --fix (uses last error)
      if (/^--?fix\b/i.test(rest)) {
        if (!lastErrorRef.current) { appendLine({ kind: 'err', text: 'Rien à corriger : aucune erreur récente.' }); return; }
        appendLine({ kind: 'sys', text: 'IA propose une correction pour la dernière erreur…' });
        await requestAiSuggestions(lastErrorRef.current.cmd, lastErrorRef.current.out, `Corrige cette commande qui a échoué : ${lastErrorRef.current.cmd}`);
        return;
      }
      // --suggest <prompt> → build command candidates
      const suggestMatch = /^--?suggest\s+(.+)$/i.exec(rest);
      if (suggestMatch) {
        appendLine({ kind: 'sys', text: 'IA construit des commandes candidates…' });
        await requestAiSuggestions('prompt', '', suggestMatch[1].trim());
        return;
      }
      // Default → chat conversationnel
      if (!props.aiEnabled) { appendLine({ kind: 'err', text: 'IA désactivée — active-la dans la barre du terminal.' }); return; }
      setAiLoading(true);
      setAiLoadingLabel('🤖 IA réfléchit…');
      try {
        const reply = await chatWithAI(rest, []);
        setAiLoading(false);
        if (reply) reply.split('\n').forEach((l) => appendLine({ kind: 'out', text: `🤖 ${l}` }));
        else appendLine({ kind: 'err', text: 'IA n\'a rien renvoyé.' });
      } catch (err) {
        setAiLoading(false);
        appendLine({ kind: 'err', text: `IA indisponible : ${err instanceof Error ? err.message : 'erreur'}` });
      }
      return;
    }

    const result = await executeShell(cmd);
    if (result.code !== 0) {
      lastErrorRef.current = { cmd, out: (result.stdout || '') + '\n' + (result.stderr || '') };
    }
    setTimeout(() => inputRef.current?.focus(), 0);
    requestAiSuggestions(cmd, result.stdout + '\n' + result.stderr);
  }, [appendLine, changeDirectory, executeShell, printHelp, promptText, props, requestAiSuggestions, runAgentLoop, explainCommand, chatWithAI]);



  // Compute suggestions + ghost text on each input change
  useEffect(() => {
    const local = computeSuggestions({ input, history, outputTokens, cwd });
    const ai = aiSuggestions.filter((s) => !input || s.value.toLowerCase().startsWith(input.toLowerCase()));
    const merged = [...ai, ...local.filter((s) => !ai.some((a) => a.value === s.value))].slice(0, 12);
    setSuggestions(merged);
    setSuggestIdx(0);
    setGhost(merged[0] && merged[0].value.startsWith(input) && merged[0].value !== input ? merged[0].value.slice(input.length) : '');

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
  }, [input, history, outputTokens, cwd, aiSuggestions]);

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
    // Mechanical key sound on any printable/nav key (respects user toggle)
    if (e.key.length === 1 || ['Backspace', 'Enter', 'Tab', 'Space', ' '].includes(e.key)) {
      playKey();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestOpen && suggestions[suggestIdx]) {
        const chosen = suggestions[suggestIdx].value;
        setInput(chosen);
        setSuggestOpen(false);
        if (suggestions[suggestIdx].source === 'ai') bumpSuggestionUse(chosen);
        return;
      }
      exec(input);
      setInput('');
      setGhost('');
      setSuggestOpen(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (suggestOpen && suggestions[suggestIdx]) {
        setInput(suggestions[suggestIdx].value);
        setSuggestOpen(false);
      } else if (ghost) acceptGhost();
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
    } else if (e.key === 'c' && e.ctrlKey) {
      // Ctrl+C: interrompt commande courante ET/OU boucle AUTO
      if (autoLoop?.active) {
        e.preventDefault();
        autoAbortRef.current = true;
        appendLine({ kind: 'err', text: '⏹ AUTO : interruption demandée…' });
      }
      if (running) {
        e.preventDefault();
        streamRef.current?.abort();
        appendLine({ kind: 'err', text: '^C interrupted' });
        setRunning(false);
      }
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

        {agentSteps.length > 0 && (autoLoop?.active || agentSteps.some((s) => s.status === 'error' || s.status === 'running')) && (
          <AgentSteps
            steps={agentSteps}
            goal={autoLoop?.goal || ''}
            iter={autoLoop?.iter || 0}
            max={20}
            onAbort={autoLoop?.active ? () => { autoAbortRef.current = true; } : undefined}
          />
        )}

        {/* Prompt line */}
        <div className="flex items-center relative mt-0.5">
          <StatusDot running={running} />
          {autoLoop?.active && (
            <span className="mr-1.5 shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-400/30 animate-pulse">
              AGENT · {autoLoop.iter}/20
            </span>
          )}
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
            {(suggestOpen || aiLoading) && (suggestions.length > 0 || aiLoading) && (
              <div className="absolute left-0 top-5 z-20 glass-menu rounded-lg py-1 min-w-[300px] max-w-[520px] shadow-2xl border border-border/40 animate-scale-in terminal-suggest-pop">
                {aiLoading && (
                  <div className="px-2.5 py-1.5 border-b border-border/40">
                    <NpmSpinner label={aiLoadingLabel} />
                  </div>
                )}
                {suggestions.map((s, i) => (
                  <button
                    key={s.value + i}
                    onMouseDown={(e) => { e.preventDefault(); setInput(s.value); setSuggestOpen(false); inputRef.current?.focus(); }}
                    className={cn(
                      'w-full text-left px-2.5 py-1 text-[11px] flex items-center gap-2 font-mono transition-all',
                      i === suggestIdx ? 'bg-primary/15 text-foreground' : 'hover:bg-[hsl(var(--explorer-hover))]',
                      s.source === 'ai' && 'terminal-ai-suggestion',
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
          {running && !streamRef.current && <NpmSpinner className="ml-2" />}
        </div>
      </div>
      <ConfirmDangerousDialog
        open={!!dangerPrompt}
        command={dangerPrompt?.command || ''}
        reason={dangerPrompt?.reason || ''}
        onConfirm={() => { dangerPrompt?.resolve(true); setDangerPrompt(null); }}
        onCancel={() => { dangerPrompt?.resolve(false); setDangerPrompt(null); }}
      />
    </div>
  );
}

function StatusDot({ running }: { running: boolean }) {
  return (
    <span
      className={cn(
        'inline-block w-1.5 h-1.5 rounded-full mr-1.5 shrink-0',
        running ? 'bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.55)]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]',
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
