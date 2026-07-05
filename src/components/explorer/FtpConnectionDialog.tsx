import { useState } from 'react';
import { Loader2, Plug } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/apiClient';

/**
 * FTP connection dialog — replaces the previous env-variable configuration.
 * Persists the source through the local API (`POST /api/sources`).
 */
export function FtpConnectionDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (source: { id: string; name: string }) => void;
}) {
  const [form, setForm] = useState({
    name: '', host: '', port: 21, user: '', password: '', secure: false,
  });
  const [status, setStatus] = useState<'idle' | 'testing' | 'saving' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((prev) => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!form.host) { setError('Adresse hôte requise.'); return; }
    setError(null); setStatus('testing');
    try {
      const test = await api.post<{ success: boolean; error?: string }>('/api/ftp/test', form);
      if (!test.success) { setStatus('error'); setError(test.error || 'Échec du test de connexion.'); return; }
      setStatus('saving');
      const saved = await api.post<{ success: boolean; source: any; error?: string }>('/api/sources', {
        ...form, type: 'ftp', name: form.name || form.host,
      });
      if (!saved.success) { setStatus('error'); setError(saved.error || 'Impossible d\'enregistrer la source.'); return; }
      onCreated({ id: saved.source.id, name: saved.source.name });
      onOpenChange(false);
      setStatus('idle');
      setForm({ name: '', host: '', port: 21, user: '', password: '', secure: false });
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const busy = status === 'testing' || status === 'saving';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-normal flex items-center gap-2">
            <Plug size={14} /> Nouvelle connexion FTP
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-2 text-[12px]">
          <Field label="Nom (optionnel)">
            <input value={form.name} onChange={(e) => update('name', e.target.value)}
              placeholder="Serveur de prod" className={inputCls} />
          </Field>
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <Field label="Hôte">
              <input value={form.host} onChange={(e) => update('host', e.target.value)}
                placeholder="ftp.example.com" className={inputCls} autoFocus />
            </Field>
            <Field label="Port">
              <input type="number" value={form.port} onChange={(e) => update('port', Number(e.target.value) || 21)} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Utilisateur">
              <input value={form.user} onChange={(e) => update('user', e.target.value)}
                placeholder="anonymous" className={inputCls} />
            </Field>
            <Field label="Mot de passe">
              <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)}
                className={inputCls} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground select-none">
            <input type="checkbox" checked={form.secure} onChange={(e) => update('secure', e.target.checked)} />
            Utiliser FTPS (TLS)
          </label>

          {error && <p className="text-[11px] text-red-400 font-light">{error}</p>}
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 px-3 text-[12px] rounded border border-border/40 hover:bg-[hsl(var(--explorer-hover))]"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="h-8 px-3 text-[12px] rounded bg-primary/90 text-primary-foreground hover:bg-primary flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            {status === 'testing' ? 'Test…' : status === 'saving' ? 'Enregistrement…' : 'Se connecter'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const inputCls = 'w-full h-7 px-2 text-[12px] bg-[hsl(var(--muted))] border border-border/40 rounded outline-none focus:border-primary/50';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</span>
      {children}
    </label>
  );
}
