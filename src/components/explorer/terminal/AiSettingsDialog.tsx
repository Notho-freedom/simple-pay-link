import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  loadPrefs, savePrefs, DEFAULT_MODELS, DEFAULT_BASE_URLS,
  makeProviderId, testProvider, fetchModels,
  type Prefs, type ProviderConfig, type ProviderKind,
} from '@/lib/aiProviders';
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const KIND_LABELS: Record<ProviderKind, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
  ollama: 'Ollama (local)',
  custom: 'OpenAI-compatible',
  lovable: 'Lovable AI',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AiSettingsDialog({ open, onClose }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [testing, setTesting] = useState<Record<string, { loading: boolean; ok?: boolean; msg?: string }>>({});
  const [fetching, setFetching] = useState<Record<string, boolean>>({});

  useEffect(() => { if (open) setPrefs(loadPrefs()); }, [open]);

  const persist = (next: Prefs) => { setPrefs(next); savePrefs(next); };

  const addProvider = (kind: ProviderKind) => {
    const id = makeProviderId(kind);
    const p: ProviderConfig = {
      id, kind, label: KIND_LABELS[kind],
      apiKey: '', baseUrl: DEFAULT_BASE_URLS[kind],
      models: [...DEFAULT_MODELS[kind]],
      activeModel: DEFAULT_MODELS[kind][0],
      enabled: true,
    };
    persist({ ...prefs, providers: [...prefs.providers, p], order: [...prefs.order, id] });
  };

  const removeProvider = (id: string) => {
    if (id === 'lovable') return;
    persist({
      ...prefs,
      providers: prefs.providers.filter((p) => p.id !== id),
      order: prefs.order.filter((x) => x !== id),
      activeId: prefs.activeId === id ? 'lovable' : prefs.activeId,
    });
  };

  const update = (id: string, patch: Partial<ProviderConfig>) => {
    persist({ ...prefs, providers: prefs.providers.map((p) => p.id === id ? { ...p, ...patch } : p) });
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = prefs.order.indexOf(id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= prefs.order.length) return;
    const order = [...prefs.order];
    [order[idx], order[to]] = [order[to], order[idx]];
    persist({ ...prefs, order });
  };

  const test = async (p: ProviderConfig) => {
    setTesting((prev) => ({ ...prev, [p.id]: { loading: true } }));
    const res = await testProvider(p, p.activeModel || p.models[0]);
    setTesting((prev) => ({ ...prev, [p.id]: { loading: false, ok: res.ok, msg: res.message } }));
  };

  const refreshModels = async (p: ProviderConfig) => {
    setFetching((prev) => ({ ...prev, [p.id]: true }));
    const models = await fetchModels(p);
    setFetching((prev) => ({ ...prev, [p.id]: false }));
    if (models.length) update(p.id, { models, activeModel: p.activeModel && models.includes(p.activeModel) ? p.activeModel : models[0] });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Fournisseurs IA du terminal</DialogTitle>
        </DialogHeader>

        <div className="text-xs text-muted-foreground mb-2">
          L'agent bascule automatiquement au fournisseur suivant en cas d'erreur (401, 429, quotas, timeout). Les clés sont stockées uniquement dans ce navigateur.
        </div>

        <div className="flex-1 overflow-y-auto thin-scrollbar space-y-3 pr-2">
          {prefs.providers.map((p) => {
            const t = testing[p.id];
            const orderIdx = prefs.order.indexOf(p.id);
            return (
              <div key={p.id} className={cn('rounded-lg border p-3 space-y-2', p.enabled ? 'border-border/60 bg-card/30' : 'border-border/30 bg-card/10 opacity-60')}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground w-6">#{orderIdx + 1}</span>
                  <Input value={p.label} onChange={(e) => update(p.id, { label: e.target.value })} className="h-7 text-sm font-medium flex-1" />
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{KIND_LABELS[p.kind]}</span>
                  <Switch checked={p.enabled} onCheckedChange={(v) => update(p.id, { enabled: v })} />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(p.id, -1)} disabled={orderIdx <= 0}><ChevronUp size={14} /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(p.id, 1)} disabled={orderIdx >= prefs.order.length - 1}><ChevronDown size={14} /></Button>
                  {p.id !== 'lovable' && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-red-400" onClick={() => removeProvider(p.id)}><Trash2 size={14} /></Button>
                  )}
                </div>

                {p.kind !== 'lovable' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {p.kind !== 'ollama' && (
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Clé API</Label>
                        <Input type="password" value={p.apiKey || ''} onChange={(e) => update(p.id, { apiKey: e.target.value })} placeholder="sk-…" className="h-7 text-xs font-mono" />
                      </div>
                    )}
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Base URL</Label>
                      <Input value={p.baseUrl || ''} onChange={(e) => update(p.id, { baseUrl: e.target.value })} placeholder={DEFAULT_BASE_URLS[p.kind]} className="h-7 text-xs font-mono" />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground shrink-0">Modèle actif</Label>
                  <select
                    value={p.activeModel || ''}
                    onChange={(e) => update(p.id, { activeModel: e.target.value })}
                    className="h-7 text-xs bg-background border border-border/60 rounded px-2 flex-1 font-mono"
                  >
                    {p.models.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {p.kind !== 'lovable' && (
                    <Button size="sm" variant="outline" className="h-7" onClick={() => refreshModels(p)} disabled={fetching[p.id]}>
                      {fetching[p.id] ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      <span className="ml-1 text-[10px]">Modèles</span>
                    </Button>
                  )}
                  {p.kind !== 'lovable' && (
                    <Button size="sm" variant="outline" className="h-7" onClick={() => test(p)} disabled={t?.loading}>
                      {t?.loading ? <Loader2 size={12} className="animate-spin" /> :
                        t?.ok === true ? <CheckCircle2 size={12} className="text-emerald-400" /> :
                          t?.ok === false ? <XCircle size={12} className="text-red-400" /> : null}
                      <span className="ml-1 text-[10px]">Tester</span>
                    </Button>
                  )}
                </div>

                <div>
                  <Label className="text-[10px] text-muted-foreground">Modèles (un par ligne, personnalisables)</Label>
                  <textarea
                    value={p.models.join('\n')}
                    onChange={(e) => update(p.id, { models: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                    className="w-full h-16 text-[11px] font-mono bg-background border border-border/60 rounded p-1.5 thin-scrollbar"
                  />
                </div>

                {t?.msg && (
                  <div className={cn('text-[10px] font-mono truncate', t.ok ? 'text-emerald-400' : 'text-red-400')}>{t.msg}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-border/40 pt-3 flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground mr-1 self-center">Ajouter :</span>
          {(['openai', 'anthropic', 'gemini', 'openrouter', 'ollama', 'custom'] as ProviderKind[]).map((k) => (
            <Button key={k} size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => addProvider(k)}>
              <Plus size={12} className="mr-1" />{KIND_LABELS[k]}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
