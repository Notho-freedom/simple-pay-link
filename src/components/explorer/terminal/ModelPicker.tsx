import { useState, useEffect } from 'react';
import { loadPrefs, setActive, type Prefs } from '@/lib/aiProviders';
import { Cpu, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onOpenSettings: () => void;
}

export function ModelPicker({ onOpenSettings }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setPrefs(loadPrefs());
    window.addEventListener('ai-prefs-changed', handler);
    return () => window.removeEventListener('ai-prefs-changed', handler);
  }, []);

  const active = prefs.providers.find((p) => p.id === prefs.activeId);
  const label = active ? `${active.label.split(' ')[0]} · ${prefs.activeModel || ''}` : 'Aucun';

  const choose = (providerId: string, model: string) => {
    setActive(providerId, model);
    setPrefs(loadPrefs());
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 h-5 px-1.5 rounded hover:bg-[hsl(var(--explorer-hover))] text-[10px] font-mono max-w-[240px]"
        title="Changer de modèle IA (auto-switch en cas d'erreur)"
      >
        <Cpu size={10} className="text-primary shrink-0" />
        <span className="truncate">{label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-6 right-0 z-50 glass-menu rounded-lg py-1 min-w-[280px] max-w-[360px] max-h-[400px] overflow-y-auto thin-scrollbar shadow-2xl border border-border/40 animate-fade-in">
            {prefs.providers.filter((p) => p.enabled).map((p) => (
              <div key={p.id}>
                <div className="px-2.5 py-1 text-[9px] uppercase tracking-wider text-muted-foreground font-mono border-b border-border/20">{p.label}</div>
                {p.models.map((m) => {
                  const isActive = prefs.activeId === p.id && prefs.activeModel === m;
                  return (
                    <button
                      key={p.id + m}
                      onClick={() => choose(p.id, m)}
                      className={cn(
                        'w-full text-left px-2.5 py-1 text-[11px] font-mono hover:bg-[hsl(var(--explorer-hover))] flex items-center justify-between gap-2',
                        isActive && 'bg-primary/15 text-foreground',
                      )}
                    >
                      <span className="truncate">{m}</span>
                      {isActive && <Check size={11} className="text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="border-t border-border/40 mt-1 pt-1">
              <button
                onClick={() => { setOpen(false); onOpenSettings(); }}
                className="w-full text-left px-2.5 py-1 text-[11px] hover:bg-[hsl(var(--explorer-hover))] text-primary"
              >
                ⚙ Gérer les fournisseurs IA…
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
