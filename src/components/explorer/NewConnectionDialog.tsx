import { useMemo, useState, useEffect } from 'react';
import { Loader2, Plug, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LocationIcon } from './FileIcon';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import type { LocationKey } from '@/lib/iconResolver';

const LOCAL_SOURCES_KEY = 'explorer.sources.local.v1';

/**
 * Connection type as consumed by the sidebar/back-end. `ftp` is now a unified
 * family that carries an inner variant (`ftp` | `ftps` | `sftp`) — the dialog
 * chooses the right defaults through a segmented control instead of three
 * separate cards.
 */
export type ConnectionType =
  | 'ftp'
  | 'smb' | 'webdav'
  | 'gdrive' | 'onedrive' | 'dropbox'
  | 'box' | 'icloud' | 's3';

type FtpVariant = 'ftp' | 'ftps' | 'sftp';

interface TypeMeta {
  id: ConnectionType;
  label: string;
  hint: string;
  iconKey: LocationKey;
  defaultPort?: number;
  fields: Array<'host' | 'port' | 'user' | 'password' | 'path' | 'secure' | 'endpoint' | 'bucket' | 'accessKey' | 'secretKey' | 'clientId' | 'clientSecret' | 'refreshToken' | 'token' | 'privateKey'>;
}

const TYPES: TypeMeta[] = [
  { id: 'ftp',      label: 'FTP',         hint: 'FTP · FTPS · SFTP unifié',           iconKey: 'ftp',         defaultPort: 21,  fields: ['host', 'port', 'user', 'password', 'path'] },
  { id: 'smb',      label: 'SMB / CIFS',  hint: 'Partage Windows / Samba',            iconKey: 'smb',         defaultPort: 445, fields: ['host', 'port', 'user', 'password', 'path'] },
  { id: 'webdav',   label: 'WebDAV',      hint: 'Nextcloud, ownCloud, IIS…',          iconKey: 'webdav',      defaultPort: 443, fields: ['host', 'user', 'password', 'path'] },
  { id: 'gdrive',   label: 'Google Drive', hint: 'OAuth utilisateur (client ID)',     iconKey: 'googleDrive', fields: ['clientId', 'clientSecret', 'refreshToken'] },
  { id: 'onedrive', label: 'OneDrive',    hint: 'Microsoft Graph API',                iconKey: 'oneDrive',    fields: ['clientId', 'clientSecret', 'refreshToken'] },
  { id: 'dropbox',  label: 'Dropbox',     hint: 'App token personnel',                iconKey: 'dropbox',     fields: ['token'] },
  { id: 'box',      label: 'Box',         hint: 'OAuth Box / developer token',        iconKey: 'box',         fields: ['clientId', 'clientSecret', 'refreshToken'] },
  { id: 'icloud',   label: 'iCloud Drive', hint: 'App-specific password',             iconKey: 'icloud',      fields: ['user', 'password', 'path'] },
  { id: 's3',       label: 'S3 / MinIO',  hint: 'AWS S3 ou compatible',               iconKey: 's3',          fields: ['endpoint', 'bucket', 'accessKey', 'secretKey'] },
];

type FormState = Record<string, string | number | boolean>;

const ftpDefaults: Record<FtpVariant, { port: number; secure: boolean }> = {
  ftp: { port: 21, secure: false },
  ftps: { port: 990, secure: true },
  sftp: { port: 22, secure: false },
};

const initialFor = (t: TypeMeta): FormState => {
  const base: FormState = { name: '', type: t.id };
  if (t.id === 'ftp') { base.port = 21; base.secure = false; }
  else if (t.fields.includes('port')) base.port = t.defaultPort || 21;
  return base;
};

function cloudLabel(type: ConnectionType) {
  const map: Record<ConnectionType, string> = {
    ftp: 'FTP', smb: 'SMB', webdav: 'WebDAV',
    gdrive: 'Google Drive', onedrive: 'OneDrive', dropbox: 'Dropbox',
    box: 'Box', icloud: 'iCloud Drive', s3: 'S3',
  };
  return map[type] || String(type).toUpperCase();
}

function persistLocalSource(type: ConnectionType, meta: TypeMeta, form: FormState, ftpVariant: FtpVariant | null) {
  const provider = type === 'ftp' ? ftpVariant || 'ftp' : type;
  const source = {
    id: `local-src-${provider}-${Date.now()}`,
    type: (['ftp'].includes(type) ? 'ftp' : ['smb', 'webdav'].includes(type) ? 'network' : 'cloud'),
    provider,
    name: (form.name as string) || (form.host as string) || (form.bucket as string) || cloudLabel(type),
    host: form.host as string | undefined,
    port: form.port as number | undefined,
    root: (form.path as string) || (form.bucket as string) || cloudLabel(type),
    status: 'configured',
    readOnly: false,
    mock: false,
  };
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_SOURCES_KEY) || '[]');
    localStorage.setItem(LOCAL_SOURCES_KEY, JSON.stringify([...list, source]));
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('explorer:sources-changed'));
  return source;
}

export function NewConnectionDialog({
  open, onOpenChange, onCreated, initialType,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (source: { id: string; name: string }) => void;
  initialType?: ConnectionType;
}) {
  const [type, setType] = useState<ConnectionType>(initialType || 'ftp');
  const meta = useMemo(() => TYPES.find((t) => t.id === type)!, [type]);
  const [form, setForm] = useState<FormState>(() => initialFor(meta));
  const [ftpVariant, setFtpVariant] = useState<FtpVariant>('ftp');
  const [testResult, setTestResult] = useState<null | { ok: boolean; message?: string }>(null);
  const [status, setStatus] = useState<'idle' | 'testing' | 'saving' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset test state when switching types/variants
    setTestResult(null);
    setError(null);
    setStatus('idle');
  }, [type, ftpVariant]);

  const changeType = (id: ConnectionType) => {
    const next = TYPES.find((t) => t.id === id)!;
    setType(id);
    setFtpVariant('ftp');
    setForm(initialFor(next));
  };

  const changeFtpVariant = (v: FtpVariant) => {
    setFtpVariant(v);
    setForm((prev) => ({
      ...prev,
      port: ftpDefaults[v].port,
      secure: ftpDefaults[v].secure,
    }));
  };

  const update = (k: string, v: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setTestResult(null);
  };

  const runTest = async (): Promise<boolean> => {
    setError(null);
    if (meta.fields.includes('host') && !form.host) { setError('Adresse hôte requise.'); return false; }
    setStatus('testing');
    try {
      if (type === 'ftp') {
        const res = await api.post<{ success: boolean; error?: string }>('/api/ftp/test', {
          ...form,
          variant: ftpVariant,
          secure: ftpVariant === 'ftps' ? true : Boolean(form.secure),
        });
        if (!res.success) {
          setTestResult({ ok: false, message: res.error || 'Échec du test' });
          setStatus('error');
          return false;
        }
        setTestResult({ ok: true, message: 'Connexion réussie' });
        setStatus('idle');
        return true;
      }
      if (type === 'webdav') {
        const res = await api.post<{ success: boolean; error?: string }>('/api/webdav/test', form);
        if (!res.success) { setTestResult({ ok: false, message: res.error || 'WebDAV inaccessible' }); setStatus('error'); return false; }
        setTestResult({ ok: true, message: 'Connexion WebDAV réussie' });
        setStatus('idle');
        return true;
      }
      // Cloud OAuth/S3: require credentials before saving, no fake “success” copy.
      const missing: string[] = [];
      for (const f of meta.fields) {
        if (['secure', 'path'].includes(f)) continue;
        if (!form[f]) missing.push(f);
      }
      if (missing.length) {
        setTestResult({ ok: false, message: `Champs manquants: ${missing.join(', ')}` });
        setStatus('error');
        return false;
      }
      setTestResult({ ok: true, message: 'Identifiants requis présents' });
      setStatus('idle');
      return true;
    } catch (err) {
      setTestResult({ ok: false, message: (err as Error).message });
      setStatus('error');
      return false;
    }
  };

  const submit = async () => {
    const ok = await runTest();
    if (!ok) return;
    setStatus('saving');
    try {
      const payload = {
        ...form,
        type: type === 'ftp' ? 'ftp' : type,
        variant: type === 'ftp' ? ftpVariant : undefined,
        name: (form.name as string) || (form.host as string) || meta.label,
      };
      let saved = await api.post<{ success: boolean; source: { id: string; name: string }; error?: string }>('/api/sources', payload);
      if (!saved.success && type !== 'ftp') {
        saved = { success: true, source: persistLocalSource(type, meta, form, null) };
      }
      if (!saved.success) { setStatus('error'); setError(saved.error || 'Impossible d\'enregistrer la source.'); return; }
      onCreated(saved.source);
      onOpenChange(false);
      setStatus('idle');
      setForm(initialFor(meta));
      setTestResult(null);
    } catch (err) {
      if (type !== 'ftp') {
        const source = persistLocalSource(type, meta, form, null);
        onCreated(source);
        onOpenChange(false);
        setStatus('idle');
        setForm(initialFor(meta));
        setTestResult(null);
        return;
      }
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const busy = status === 'testing' || status === 'saving';
  const canSave = !busy;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/30">
          <DialogTitle className="text-[14px] font-normal flex items-center gap-2">
            <Plug size={14} /> Nouvelle connexion
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[220px_1fr] gap-0 min-h-[420px] max-h-[70vh]">
          {/* Type picker */}
          <div className="border-r border-border/30 p-2 space-y-0.5 overflow-y-auto thin-scrollbar">
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => changeType(t.id)}
                className={cn(
                  'w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors',
                  type === t.id
                    ? 'bg-primary/15 text-foreground'
                    : 'hover:bg-[hsl(var(--explorer-hover))] text-muted-foreground',
                )}
              >
                <span className="w-8 h-8 rounded flex items-center justify-center bg-[hsl(var(--muted))]/60 shrink-0">
                  <LocationIcon locationKey={t.iconKey} size={22} alt={t.label} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-normal truncate">{t.label}</span>
                  <span className="block text-[10px] text-muted-foreground/80 font-light truncate">{t.hint}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="p-5 space-y-3 text-[12px] overflow-y-auto thin-scrollbar">
            {type === 'ftp' && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1.5">Protocole</div>
                <div className="inline-flex rounded-full border border-border/40 p-0.5 bg-[hsl(var(--muted))]/40">
                  {(['ftp', 'ftps', 'sftp'] as FtpVariant[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => changeFtpVariant(v)}
                      className={cn(
                        'px-3 h-6 text-[11px] font-mono rounded-full transition-all',
                        ftpVariant === v
                          ? 'bg-primary text-primary-foreground shadow'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground/70 mt-1.5 font-light">
                  {ftpVariant === 'ftp' && 'FTP classique, port 21, non chiffré.'}
                  {ftpVariant === 'ftps' && 'FTP sécurisé via TLS, port 990.'}
                  {ftpVariant === 'sftp' && 'SSH File Transfer Protocol, port 22.'}
                </p>
              </div>
            )}

            <Field label="Nom (optionnel)">
              <input value={(form.name as string) || ''} onChange={(e) => update('name', e.target.value)}
                placeholder={meta.label} className={inputCls} />
            </Field>

            {meta.fields.includes('host') && (
              <div className="grid grid-cols-[1fr_100px] gap-2">
                <Field label="Hôte / URL">
                  <input value={(form.host as string) || ''} onChange={(e) => update('host', e.target.value)}
                    placeholder={type === 'webdav' ? 'https://cloud.example.com/remote.php/dav' : 'srv.example.com'}
                    className={inputCls} autoFocus />
                </Field>
                {meta.fields.includes('port') && (
                  <Field label="Port">
                    <input type="number" value={Number(form.port) || meta.defaultPort || 21}
                      onChange={(e) => update('port', Number(e.target.value) || meta.defaultPort || 21)}
                      className={inputCls} />
                  </Field>
                )}
              </div>
            )}

            {(meta.fields.includes('user') || meta.fields.includes('password')) && (
              <div className="grid grid-cols-2 gap-2">
                {meta.fields.includes('user') && (
                  <Field label="Utilisateur">
                    <input value={(form.user as string) || ''} onChange={(e) => update('user', e.target.value)}
                      placeholder={type === 'ftp' && ftpVariant === 'ftp' ? 'anonymous' : ''} className={inputCls} />
                  </Field>
                )}
                {meta.fields.includes('password') && (
                  <Field label={type === 'ftp' && ftpVariant === 'sftp' ? 'Mot de passe (ou clé)' : 'Mot de passe'}>
                    <input type="password" value={(form.password as string) || ''}
                      onChange={(e) => update('password', e.target.value)} className={inputCls} />
                  </Field>
                )}
              </div>
            )}

            {type === 'ftp' && ftpVariant === 'sftp' && (
              <Field label="Clé privée SSH (optionnel)">
                <textarea
                  value={(form.privateKey as string) || ''}
                  onChange={(e) => update('privateKey', e.target.value)}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                  rows={3}
                  className={cn(inputCls, 'h-auto py-1.5 font-mono text-[10px]')}
                />
              </Field>
            )}

            {meta.fields.includes('path') && (
              <Field label="Chemin distant (optionnel)">
                <input value={(form.path as string) || ''} onChange={(e) => update('path', e.target.value)}
                  placeholder="/share ou /remote.php/dav/files/user" className={inputCls} />
              </Field>
            )}

            {type === 'ftp' && ftpVariant === 'ftp' && (
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground select-none">
                <input type="checkbox" checked={!!form.secure} onChange={(e) => update('secure', e.target.checked)} />
                Utiliser TLS (mode explicite)
              </label>
            )}

            {/* Cloud OAuth */}
            {meta.fields.includes('clientId') && (
              <Field label="Client ID">
                <input value={(form.clientId as string) || ''} onChange={(e) => update('clientId', e.target.value)} className={inputCls} />
              </Field>
            )}
            {meta.fields.includes('clientSecret') && (
              <Field label="Client Secret">
                <input type="password" value={(form.clientSecret as string) || ''}
                  onChange={(e) => update('clientSecret', e.target.value)} className={inputCls} />
              </Field>
            )}
            {meta.fields.includes('refreshToken') && (
              <Field label="Refresh token">
                <input type="password" value={(form.refreshToken as string) || ''}
                  onChange={(e) => update('refreshToken', e.target.value)}
                  placeholder="Généré après OAuth" className={inputCls} />
              </Field>
            )}
            {meta.fields.includes('token') && (
              <Field label="Token d'accès">
                <input type="password" value={(form.token as string) || ''}
                  onChange={(e) => update('token', e.target.value)}
                  placeholder="Console développeur" className={inputCls} />
              </Field>
            )}

            {/* S3 */}
            {meta.fields.includes('endpoint') && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Endpoint">
                  <input value={(form.endpoint as string) || ''} onChange={(e) => update('endpoint', e.target.value)}
                    placeholder="s3.amazonaws.com" className={inputCls} />
                </Field>
                <Field label="Bucket">
                  <input value={(form.bucket as string) || ''} onChange={(e) => update('bucket', e.target.value)} className={inputCls} />
                </Field>
              </div>
            )}
            {meta.fields.includes('accessKey') && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Access key">
                  <input value={(form.accessKey as string) || ''} onChange={(e) => update('accessKey', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Secret key">
                  <input type="password" value={(form.secretKey as string) || ''}
                    onChange={(e) => update('secretKey', e.target.value)} className={inputCls} />
                </Field>
              </div>
            )}

            {(['gdrive', 'onedrive', 'box', 'icloud', 'dropbox', 's3', 'webdav'] as ConnectionType[]).includes(type) && (
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed pt-1 border-t border-border/20 mt-2">
                <LocationIcon locationKey="cloud" size={10} className="inline mr-1" />
                Enregistrement sans simulation : les identifiants sont validés au minimum, puis la source est ajoutée comme connexion configurée.
              </p>
            )}

            {testResult && (
              <div
                className={cn(
                  'flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px] font-light animate-fade-in',
                  testResult.ok
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-red-500/30 bg-red-500/10 text-red-300',
                )}
              >
                {testResult.ok ? <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> : <XCircle size={12} className="mt-0.5 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}

            {error && <p className="text-[11px] text-red-400 font-light">{error}</p>}
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border/30 flex items-center gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 px-3 text-[12px] rounded border border-border/40 hover:bg-[hsl(var(--explorer-hover))]"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!canSave}
            className={cn(
              'h-8 px-3 text-[12px] rounded flex items-center gap-1.5 transition-all',
              canSave
                ? 'bg-primary/90 text-primary-foreground hover:bg-primary'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
            title="Teste automatiquement puis enregistre si la connexion est valide"
          >
            {(status === 'saving' || status === 'testing') && <Loader2 size={12} className="animate-spin" />}
            {status === 'testing' ? 'Test…' : status === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const inputCls = 'w-full h-8 px-2 text-[12px] bg-[hsl(var(--muted))] border border-border/40 rounded outline-none focus:border-primary/50';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</span>
      {children}
    </label>
  );
}
