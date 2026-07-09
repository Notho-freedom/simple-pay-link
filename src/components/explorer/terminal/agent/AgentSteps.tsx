import { Check, CircleDot, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AgentStepStatus = 'pending' | 'running' | 'ok' | 'error';

export interface AgentStep {
  id: string;
  label: string;
  status: AgentStepStatus;
  detail?: string;
}

interface Props {
  steps: AgentStep[];
  goal: string;
  iter: number;
  max: number;
  onAbort?: () => void;
}

export function AgentSteps({ steps, goal, iter, max, onAbort }: Props) {
  return (
    <div className="my-1.5 rounded-md border border-indigo-400/25 bg-gradient-to-br from-indigo-500/[0.06] to-cyan-500/[0.04] backdrop-blur-sm px-2.5 py-2 animate-fade-in font-mono text-[11px]">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-200 text-[9px] uppercase tracking-wide border border-indigo-400/30">
            Agent · {iter}/{max}
          </span>
          <span className="text-foreground/85 truncate" title={goal}>{goal}</span>
        </div>
        {onAbort && (
          <button
            onClick={onAbort}
            className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-400/20 transition-colors"
            title="Interrompre l'agent (Ctrl+C)"
          >
            stop
          </button>
        )}
      </div>
      <ol className="space-y-0.5 pl-0.5">
        {steps.map((s, i) => (
          <li key={s.id + i} className="flex items-start gap-1.5 leading-tight">
            <span className="mt-[2px] shrink-0">
              {s.status === 'running' && <Loader2 size={10} className="animate-spin text-cyan-300" />}
              {s.status === 'ok' && <Check size={10} className="text-emerald-300" />}
              {s.status === 'error' && <XCircle size={10} className="text-red-300" />}
              {s.status === 'pending' && <CircleDot size={10} className="text-muted-foreground/50" />}
            </span>
            <span
              className={cn(
                'flex-1 min-w-0',
                s.status === 'running' && 'text-cyan-100',
                s.status === 'ok' && 'text-emerald-100/90',
                s.status === 'error' && 'text-red-200',
                s.status === 'pending' && 'text-muted-foreground/60',
              )}
            >
              <span>{s.label}</span>
              {s.detail && <span className="text-muted-foreground/60 ml-1">— {s.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
