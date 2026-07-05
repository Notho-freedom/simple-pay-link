import { useState, useRef, useEffect, useCallback } from 'react';
import { TerminalSquare, X, Minus, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { openContextMenu } from '@/lib/contextMenuBus';
import { api } from '@/lib/apiClient';

interface Props {
  open: boolean;
  cwd: string;
  cwdName: string;
  cwdPath?: string;
  onClose: () => void;
  onCd: (folderId: string) => void;
  onMkdir: (name: string) => void;
  /** When true, terminal fills its parent (no fixed height). */
  fill?: boolean;
  /** Optional "Open in tab" handler — shown as a button in the header. */
  onOpenInTab?: () => void;
}

interface Line {
  kind: 'cmd' | 'out' | 'err';
  text: string;
  prompt?: string;
}

const PROMPT_COLOR = 'text-emerald-400';

export function TerminalPanel({ open, cwd, cwdName, cwdPath, onClose, onMkdir, fill, onOpenInTab }: Props) {
  const [lines, setLines] = useState<Line[]>([
    { kind: 'out', text: 'PowerShell 7.4.0 — Cognitive Stream Terminal' },
    { kind: 'out', text: "Type 'help' to list commands." },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);
  const [terminalCwd, setTerminalCwd] = useState(cwdPath || cwdName);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setTerminalCwd(cwdPath || cwdName);
  }, [cwdName, cwdPath]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const promptText = `PS ${terminalCwd}>`;

  const psQuote = (value: string) => `'${value.replace(/'/g, "''")}'`;

  const exec = useCallback(
    async (raw: string) => {
      const cmd = raw.trim();
      const append = (text: string, kind: Line['kind'] = 'out') =>
        setLines((prev) => [...prev, { kind, text }]);

      setLines((prev) => [...prev, { kind: 'cmd', text: raw, prompt: promptText }]);
      if (!cmd) return;

      setHistory((prev) => [...prev, cmd]);
      setHistIdx(-1);

      const [head, ...rest] = cmd.split(/\s+/);
      const arg = rest.join(' ');

      switch (head) {
        case 'help':
          append('Commandes disponibles:');
          append('  cd <dossier>      changer de dossier réellement');
          append('  ls, dir           lister le contenu réel');
          append('  pwd               afficher le chemin réel');
          append('  mkdir <nom>       créer un dossier réel');
          append('  git, npm, node... exécution PowerShell réelle');
          append('  exit              fermer le terminal');
          break;
        case 'pwd': {
          const result = await api.post<{ success: boolean; stdout?: string; stderr?: string }>('/api/terminal/exec', {
            cwd: terminalCwd,
            command: '(Get-Location).Path',
          });
          if (result.stdout) append(result.stdout.trimEnd());
          if (result.stderr) append(result.stderr.trimEnd(), 'err');
          break;
        }
        case 'cd': {
          const target = arg || '~';
          const result = await api.post<{ success: boolean; stdout?: string; stderr?: string }>('/api/terminal/exec', {
            cwd: terminalCwd,
            command: `Set-Location -LiteralPath ${psQuote(target)}; (Get-Location).Path`,
          });
          if (result.success && result.stdout?.trim()) {
            setTerminalCwd(result.stdout.trim());
          } else {
            append((result.stderr || `cd: dossier introuvable : ${arg}`).trimEnd(), 'err');
          }
          break;
        }
        case 'clear':
        case 'cls':
          setLines([]);
          break;
        case 'mkdir':
          if (!arg) {
            append('mkdir: nom requis', 'err');
            break;
          }
          {
            const result = await api.post<{ success: boolean; stdout?: string; stderr?: string }>('/api/terminal/exec', {
              cwd: terminalCwd,
              command: `New-Item -ItemType Directory -Name ${psQuote(arg)} | Out-String`,
            });
            if (result.stdout) append(result.stdout.trimEnd());
            if (result.stderr) append(result.stderr.trimEnd(), 'err');
            if (result.success) onMkdir(arg);
          }
          break;
        case 'exit':
          onClose();
          break;
        default: {
          const result = await api.post<{ success: boolean; stdout?: string; stderr?: string; code?: number }>('/api/terminal/exec', {
            cwd: terminalCwd,
            command: cmd,
          });
          if (result.stdout) append(result.stdout.trimEnd());
          if (result.stderr) append(result.stderr.trimEnd(), 'err');
          if (!result.stdout && !result.stderr && result.code && result.code !== 0) append(`Process exited with code ${result.code}`, 'err');
        }
      }
    },
    [terminalCwd, promptText, onMkdir, onClose]
  );

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      exec(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setInput(history[next] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx < 0) return;
      const next = histIdx + 1;
      if (next >= history.length) {
        setHistIdx(-1);
        setInput('');
      } else {
        setHistIdx(next);
        setInput(history[next]);
      }
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setLines([]);
    }
  };

  if (!open) return null;

  return (
    <div className={cn(
      'bg-[hsl(var(--background))] flex flex-col shrink-0',
      fill ? 'h-full w-full' : 'h-full border-t border-border/40',
    )}>
      <div className="flex items-center gap-2 px-3 h-7 bg-[hsl(var(--explorer-surface))] border-b border-border/30 shrink-0">
        <TerminalSquare size={12} className="text-emerald-400/70" />
        <span className="text-[11px] font-mono text-muted-foreground">
          PowerShell · <span className="text-foreground/80">{terminalCwd}</span>
        </span>
        <div className="flex-1" />
        {onOpenInTab && (
          <button
            onClick={onOpenInTab}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-[hsl(var(--explorer-hover))]"
            title="Ouvrir dans un nouvel onglet"
          >
            <Maximize2 size={10} />
          </button>
        )}
        <button
          onClick={onClose}
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-[hsl(var(--explorer-hover))]"
          title="Réduire (Ctrl+`)"
        >
          <Minus size={11} />
        </button>
        <button
          onClick={onClose}
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-500/20 hover:text-red-400"
          title="Fermer"
        >
          <X size={11} />
        </button>
      </div>
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        onContextMenu={(e) => openContextMenu(e, {
          isBackground: false, isTerminal: true,
          file: null, hasClipboard: false, selectedCount: 0, targetId: cwd,
        }, async (id) => {
          if (id === 'term.copy') {
            const sel = window.getSelection()?.toString();
            if (sel) navigator.clipboard?.writeText(sel);
          } else if (id === 'term.paste') {
            try { const txt = await navigator.clipboard.readText(); setInput(prev => prev + txt); inputRef.current?.focus(); } catch { /* clipboard unavailable */ }
          } else if (id === 'term.clear') setLines([]);
          else if (id === 'term.close') onClose();
          else if (id === 'term.kill') setLines(prev => [...prev, { kind: 'err', text: '^C interrupted' }]);
        })}
        className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-[1.4] cursor-text allow-select"
      >
        {lines.map((l, i) => (
          <div key={i} className={cn('whitespace-pre-wrap break-all', l.kind === 'err' && 'text-red-400/90')}>
            {l.kind === 'cmd' ? (
              <>
                <span className={PROMPT_COLOR}>{l.prompt} </span>
                <span className="text-foreground">{l.text}</span>
              </>
            ) : (
              <span className={l.kind === 'err' ? '' : 'text-muted-foreground'}>{l.text}</span>
            )}
          </div>
        ))}
        <div className="flex items-center">
          <span className={cn(PROMPT_COLOR, 'shrink-0')}>{promptText}&nbsp;</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent outline-none text-foreground font-mono text-[11px] allow-select"
          />
        </div>
      </div>
    </div>
  );
}
