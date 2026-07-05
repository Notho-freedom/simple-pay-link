import { useMemo, useState } from 'react';
import { Loader2, Plug, Cloud, HardDrive, Server, Globe } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { HDIcon } from './icons/HDIcon';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

const GDRIVE = 'https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg';
const ONEDRIVE = 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg';
const DROPBOX = 'https://upload.wikimedia.org/wikipedia/commons/7/78/Dropbox_Icon.svg';
const S3 = 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/aws.svg';
const BOX = 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/box.svg';
const ICLOUD = 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/icloud.svg';
const LOCAL_SOURCES_KEY = 'explorer.sources.local.v1';

export type ConnectionType =
  | 'ftp' | 'ftps' | 'sftp'
  | 'smb' | 'webdav'
  | 'gdrive' | 'onedrive' | 'dropbox'
  | 'box' | 'icloud' | 's3';

interface TypeMeta {
  id: ConnectionType;
  label: string;
  hint: string;
  icon: React.ReactNode;
  defaultPort?: number;
  fields: Array<'host' | 'port' | 'user' | 'password' | 'path' | 'secure' | 'endpoint' | 'bucket' | 'accessKey' | 'secretKey' | 'clientId' | 'clientSecret' | 'refreshToken' | 'token'>;
}

const TYPES: TypeMeta[] = [
  { id: 'ftp',   label: 'FTP',   hint: 'File Transfer Protocol classique',   icon: <Server size={22} className="text-primary" />,   defaultPort: 21,  fields: ['host','port','user','password','secure'] },
  { id: 'ftps',  label: 'FTPS',  hint: 'FTP sécurisé via TLS',                icon: <Server size={22} className="text-primary" />,   defaultPort: 990, fields: ['host','port','user','password'] },
  { id: 'sftp',  label: 'SFTP',  hint: 'SSH File Transfer Protocol',           icon: <Server size={22} className="text-emerald-400" />, defaultPort: 22,  fields: ['host','port','user','password'] },
  { id: 'smb',   label: 'SMB / CIFS', hint: 'Partage Windows / Samba',         icon: <HardDrive size={22} className="text-blue-400" />, defaultPort: 445, fields: ['host','port','user','password','path'] },
  { id: 'webdav',label: 'WebDAV', hint: 'Nextcloud, ownCloud, IIS…',            icon: <Globe size={22} className="text-cyan-300" />,    defaultPort: 443, fields: ['host','user','password','path'] },
  { id: 'gdrive',   label: 'Google Drive', hint: 'OAuth utilisateur (client ID requis)', icon: <HDIcon src={GDRIVE} size={22} alt="Google Drive" />, fields: ['clientId','clientSecret','refreshToken'] },
  { id: 'onedrive', label: 'OneDrive',     hint: 'Microsoft Graph API',                  icon: <HDIcon src={ONEDRIVE} size={22} alt="OneDrive" />, fields: ['clientId','clientSecret','refreshToken'] },
  { id: 'dropbox',  label: 'Dropbox',      hint: 'App token personnel',                  icon: <HDIcon src={DROPBOX} size={22} alt="Dropbox" />, fields: ['token'] },
  { id: 'box',      label: 'Box',          hint: 'OAuth Box / developer token',          icon: <HDIcon src={BOX} size={22} alt="Box" />, fields: ['clientId','clientSecret','refreshToken'] },
  { id: 'icloud',   label: 'iCloud Drive', hint: 'App-specific password / token',         icon: <HDIcon src={ICLOUD} size={22} alt="iCloud Drive" />, fields: ['user','password','path'] },
  { id: 's3',       label: 'S3 / MinIO',   hint: 'AWS S3 ou compatible',                 icon: <HDIcon src={S3} size={22} alt="S3" />, fields: ['endpoint','bucket','accessKey','secretKey'] },
];

type FormState = Record<string, string | number | boolean>;

const initialFor = (t: TypeMeta): FormState => {
  const base: FormState = { name: '', type: t.id };
  if (t.fields.includes('port')) base.port = t.defaultPort || 21;
  if (t.fields.includes('secure')) base.secure = t.id === 'ftps';
  return base;
};

function cloudLabel(type: ConnectionType) {
  if (type === 'gdrive') return 'Google Drive';
  if (type === 'onedrive') return 'OneDrive';
  if (type === 'dropbox') return 'Dropbox';
  if (type === 'box') return 'Box';
  if (type === 'icloud') return 'iCloud Drive';
  if (type === 's3') return 'S3';
  if (type === 'webdav') return 'WebDAV';
  if (type === 'sftp') return 'SFTP';
  return type.toUpperCase();
}

function persistLocalSource(type: ConnectionType, meta: TypeMeta, form: FormState) {
  const source = {
    id: `local-src-${type}-${Date.now()}`,
    type: (['ftp', 'sftp'].includes(type) ? 'ftp' : ['smb', 'webdav'].includes(type) ? 'network' : 'cloud'),
    provider: type,
    name: (form.name as string) || (form.host as string) || (form.bucket as string) || cloudLabel(type),
    host: form.host as string | undefined,
    port: form.port as number | undefined,
    root: (form.path as string) || (form.bucket as string) || cloudLabel(type),
    status: 'configured',
    readOnly: false,
    mock: true,
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
  const [status, setStatus] = useState<'idle' | 'testing' | 'saving' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const changeType = (id: ConnectionType) => {
    const next = TYPES.find((t) => t.id === id)!;
    setType(id);
    setForm(initialFor(next));
    setError(null);
    setStatus('idle');
  };

  const update = (k: string, v: string | number | boolean) => setForm((prev) => ({ ...prev, [k]: v }));

  const submit = async () => {
    setError(null);
    if (meta.fields.includes('host') && !form.host) { setError('Adresse hôte requise.'); return; }
    if (type === 's3' && !form.endpoint) { setError('Endpoint S3 requis.'); return; }
    if ((type === 'gdrive' || type === 'onedrive') && !form.clientId) { setError('Client ID requis.'); return; }

    setStatus('testing');
    try {
      // FTP has a dedicated tester — everything else we optimistically save.
      if (type === 'ftp' || type === 'ftps') {
        const test = await api.post<{ success: boolean; error?: string }>('/api/ftp/test', {
          ...form, secure: type === 'ftps' ? true : form.secure,
        });
        if (!test.success) { setStatus('error'); setError(test.error || 'Échec du test de connexion.'); return; }
      }
      setStatus('saving');
      const payload = { ...form, type, name: (form.name as string) || (form.host as string) || meta.label };
      let saved = await api.post<{ success: boolean; source: { id: string; name: string }; error?: string }>('/api/sources', payload);
      if (!saved.success && !['ftp', 'ftps'].includes(type)) {
        saved = { success: true, source: persistLocalSource(type, meta, form) };
      }
      if (!saved.success) { setStatus('error'); setError(saved.error || 'Impossible d\'enregistrer la source.'); return; }
      onCreated(saved.source);
      onOpenChange(false);
      setStatus('idle');
      setForm(initialFor(meta));
    } catch (err) {
      if (!['ftp', 'ftps'].includes(type)) {
        const source = persistLocalSource(type, meta, form);
        onCreated(source);
        onOpenChange(false);
        setStatus('idle');
        setForm(initialFor(meta));
        return;
      }
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const busy = status === 'testing' || status === 'saving';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/30">
          <DialogTitle className="text-[14px] font-normal flex items-center gap-2">
            <Plug size={14} /> Nouvelle connexion
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[220px_1fr] gap-0 min-h-[380px]">
          {/* Type picker */}
          <div className="border-r border-border/30 p-2 space-y-0.5 overflow-y-auto max-h-[70vh]">
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
                  {t.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-normal truncate">{t.label}</span>
                  <span className="block text-[10px] text-muted-foreground/80 font-light truncate">{t.hint}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="p-5 space-y-3 text-[12px] overflow-y-auto max-h-[70vh]">
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
                      placeholder={type === 'ftp' ? 'anonymous' : ''} className={inputCls} />
                  </Field>
                )}
                {meta.fields.includes('password') && (
                  <Field label="Mot de passe">
                    <input type="password" value={(form.password as string) || ''}
                      onChange={(e) => update('password', e.target.value)} className={inputCls} />
                  </Field>
                )}
              </div>
            )}

            {meta.fields.includes('path') && (
              <Field label="Chemin distant (optionnel)">
                <input value={(form.path as string) || ''} onChange={(e) => update('path', e.target.value)}
                  placeholder="/share ou /remote.php/dav/files/user" className={inputCls} />
              </Field>
            )}

            {meta.fields.includes('secure') && (
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground select-none">
                <input type="checkbox" checked={!!form.secure} onChange={(e) => update('secure', e.target.checked)} />
                Utiliser TLS
              </label>
            )}

            {/* Cloud OAuth */}
            {meta.fields.includes('clientId') && (
              <Field label="Client ID">
                <input value={(form.clientId as string) || ''} onChange={(e) => update('clientId', e.target.value)}
                  className={inputCls} />
              </Field>
            )}
            {meta.fields.includes('clientSecret') && (
              <Field label="Client Secret">
                <input type="password" value={(form.clientSecret as string) || ''}
                  onChange={(e) => update('clientSecret', e.target.value)} className={inputCls} />
              </Field>
            )}
            {meta.fields.includes('refreshToken') && (
              <Field label="Refresh token (généré après OAuth)">
                <input type="password" value={(form.refreshToken as string) || ''}
                  onChange={(e) => update('refreshToken', e.target.value)}
                  placeholder="Généré une fois l'autorisation faite" className={inputCls} />
              </Field>
            )}
            {meta.fields.includes('token') && (
              <Field label="Token d'accès">
                <input type="password" value={(form.token as string) || ''}
                  onChange={(e) => update('token', e.target.value)}
                  placeholder="Généré depuis la console développeur" className={inputCls} />
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
                  <input value={(form.bucket as string) || ''} onChange={(e) => update('bucket', e.target.value)}
                    className={inputCls} />
                </Field>
              </div>
            )}
            {meta.fields.includes('accessKey') && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Access key">
                  <input value={(form.accessKey as string) || ''} onChange={(e) => update('accessKey', e.target.value)}
                    className={inputCls} />
                </Field>
                <Field label="Secret key">
                  <input type="password" value={(form.secretKey as string) || ''}
                    onChange={(e) => update('secretKey', e.target.value)} className={inputCls} />
                </Field>
              </div>
            )}

            {(['gdrive', 'onedrive', 'box', 'icloud', 'dropbox', 's3', 'webdav', 'sftp'] as ConnectionType[]).includes(type) && (
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed pt-1 border-t border-border/20 mt-2">
                <Cloud size={10} className="inline mr-1" />
                Connexion front-only persistée localement pour l’instant. La navigation affiche l’emplacement et garde les paramètres, sans backend fournisseur réel.
              </p>
            )}

            {error && <p className="text-[11px] text-red-400 font-light">{error}</p>}
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border/30">
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
