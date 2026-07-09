import { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NpmSpinner } from '../NpmSpinner';

export interface ChatMsg { role: 'user' | 'assistant'; content: string; }

interface Props {
  onClose: () => void;
  /** Called when user submits — parent runs agent loop with this goal. */
  onGoal: (goal: string) => void;
  /** Optional : run a plain chat message via IA (non-agent). */
  onChat: (text: string, history: ChatMsg[]) => Promise<string>;
}

export function AgentChatPane({ onClose, onGoal, onChat }: Props) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([{
    role: 'assistant',
    content: 'Salut ! Décris-moi un objectif (ex. "build ce projet", "trouve les fichiers > 100 Mo") — je pilote le terminal. Utilise « /run <objectif> » pour lancer l\'agent autonome.',
  }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [msgs, busy]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMsgs((prev) => [...prev, { role: 'user', content: text }]);

    if (/^\/run\s+/i.test(text) || /^\/auto\s+/i.test(text)) {
      const goal = text.replace(/^\/(run|auto)\s+/i, '');
      setMsgs((prev) => [...prev, { role: 'assistant', content: `▶ Lancement de l'agent autonome sur : "${goal}". Regarde le terminal à droite.` }]);
      onGoal(goal);
      return;
    }

    setBusy(true);
    try {
      const reply = await onChat(text, msgs);
      setMsgs((prev) => [...prev, { role: 'assistant', content: reply || '…' }]);
    } catch (err) {
      setMsgs((prev) => [...prev, { role: 'assistant', content: `Erreur : ${(err as Error).message}` }]);
    }
    setBusy(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--background))] border-r border-border/40">
      <div className="flex items-center justify-between px-2.5 h-7 bg-[hsl(var(--explorer-surface))] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <Sparkles size={11} className="text-indigo-300" />
          <span className="bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent">Chat IA</span>
        </div>
        <button onClick={onClose} className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-500/20 hover:text-red-400 transition-colors" title="Fermer le chat">
          <X size={11} />
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-2 space-y-2 thin-scrollbar">
        {msgs.map((m, i) => (
          <div key={i} className={cn('flex gap-1.5 animate-fade-in', m.role === 'user' && 'flex-row-reverse')}>
            <div className={cn(
              'shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center',
              m.role === 'assistant' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-400/30' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30',
            )}>
              {m.role === 'assistant' ? <Sparkles size={10} /> : <User size={10} />}
            </div>
            <div className={cn(
              'flex-1 text-[11.5px] leading-snug px-2 py-1.5 rounded-lg whitespace-pre-wrap break-words',
              m.role === 'assistant'
                ? 'bg-transparent text-foreground/90'
                : 'bg-primary/12 text-foreground border border-primary/20 max-w-[85%]',
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="px-2 py-1"><NpmSpinner label="IA rédige la réponse…" /></div>
        )}
      </div>
      <div className="border-t border-border/30 p-1.5 shrink-0">
        <div className="flex items-end gap-1.5 bg-[hsl(var(--explorer-surface))] rounded-md border border-border/40 focus-within:border-primary/50 transition-colors px-1.5 py-1">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="Écris un objectif… ( /run pour lancer l'agent )"
            className="flex-1 bg-transparent outline-none resize-none text-[11.5px] py-1 min-h-[20px] max-h-[120px] allow-select"
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="h-6 w-6 flex items-center justify-center rounded bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Envoyer (Entrée)"
          >
            <Send size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
