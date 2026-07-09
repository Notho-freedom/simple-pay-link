import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Settings, Volume2, Palette, FolderOpen, Cloud, Info } from 'lucide-react';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';
import { getBootParams, pingApi } from '@/lib/apiClient';
import { useI18n } from '@/i18n/LanguageContext';

interface Props { open: boolean; onOpenChange: (v: boolean) => void }

type Tab = 'general' | 'explorer' | 'sounds' | 'sources' | 'advanced' | 'about';

const STORE = 'explorer.settings.v1';

interface SettingsState {
  defaultView: 'grid-large' | 'grid-medium' | 'grid-small' | 'list' | 'details' | 'tiles';
  showHidden: boolean;
  showExtensions: boolean;
  language: 'fr' | 'en';
}

function readSettings(): SettingsState {
  try { return { defaultView: 'details', showHidden: false, showExtensions: true, language: 'fr', ...JSON.parse(localStorage.getItem(STORE) || '{}') }; }
  catch { return { defaultView: 'details', showHidden: false, showExtensions: true, language: 'fr' }; }
}
function writeSettings(s: SettingsState) {
  try { localStorage.setItem(STORE, JSON.stringify(s)); window.dispatchEvent(new CustomEvent('explorer:settings-changed', { detail: s })); } catch { /* noop */ }
}

export function SettingsDialog({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>('general');
  const [state, setState] = useState<SettingsState>(() => readSettings());
  const { muted, toggleMuted, setVolume, volume } = useSound() as any;
  const { language, setLanguage } = useI18n() as any;
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const boot = getBootParams();

  useEffect(() => { writeSettings(state); }, [state]);
  useEffect(() => { if (open) void pingApi().then(setApiOk); }, [open]);

  const tabs: Array<{ id: Tab; label: string; icon: any }> = [
    { id: 'general', label: 'Général', icon: Settings },
    { id: 'explorer', label: 'Explorateur', icon: FolderOpen },
    { id: 'sounds', label: 'Sons', icon: Volume2 },
    { id: 'sources', label: 'Sources', icon: Cloud },
    { id: 'advanced', label: 'Avancé', icon: Palette },
    { id: 'about', label: 'À propos', icon: Info },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <DialogTitle className="text-[14px] font-normal flex items-center gap-2"><Settings size={14} /> Paramètres</DialogTitle>
          <DialogDescription className="text-[11px] font-light">Personnalisez l'explorateur, les sources et le comportement.</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-[420px]">
          <nav className="w-48 border-r border-border/40 py-2">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={cn('flex items-center gap-2 w-full px-3 py-2 text-[12px] font-light text-left hover:bg-[hsl(var(--explorer-hover))]',
                  tab === id && 'bg-[hsl(var(--explorer-selected))] text-foreground')}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </nav>
          <div className="flex-1 p-5 overflow-auto text-[12px] font-light space-y-4">
            {tab === 'general' && (
              <>
                <Field label="Langue">
                  <select value={language || state.language}
                    onChange={(e) => { setState((s) => ({ ...s, language: e.target.value as any })); setLanguage?.(e.target.value); }}
                    className="h-7 px-2 rounded bg-[hsl(var(--muted))] border border-border/30">
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </Field>
                <Field label="Thème">
                  <span className="text-muted-foreground">Midnight Indigo (verrouillé)</span>
                </Field>
              </>
            )}
            {tab === 'explorer' && (
              <>
                <Field label="Vue par défaut">
                  <select value={state.defaultView} onChange={(e) => setState((s) => ({ ...s, defaultView: e.target.value as any }))}
                    className="h-7 px-2 rounded bg-[hsl(var(--muted))] border border-border/30">
                    <option value="details">Détails</option>
                    <option value="list">Liste</option>
                    <option value="grid-medium">Grille moyenne</option>
                    <option value="grid-large">Grille large</option>
                    <option value="tiles">Tuiles</option>
                  </select>
                </Field>
                <Toggle label="Afficher les éléments cachés" checked={state.showHidden} onChange={(v) => setState((s) => ({ ...s, showHidden: v }))} />
                <Toggle label="Afficher les extensions" checked={state.showExtensions} onChange={(v) => setState((s) => ({ ...s, showExtensions: v }))} />
              </>
            )}
            {tab === 'sounds' && (
              <>
                <Toggle label="Sons activés" checked={!muted} onChange={() => toggleMuted?.()} />
                {typeof volume === 'number' && setVolume && (
                  <Field label={`Volume (${Math.round(volume * 100)}%)`}>
                    <input type="range" min={0} max={100} value={Math.round(volume * 100)}
                      onChange={(e) => setVolume(Number(e.target.value) / 100)} className="w-48" />
                  </Field>
                )}
                <p className="text-[11px] text-muted-foreground">Les sons couvrent : sélection, ouverture, drop, corbeille, erreurs.</p>
              </>
            )}
            {tab === 'sources' && (
              <div className="space-y-2">
                <p className="text-muted-foreground">Gérez vos connexions FTP, SMB, GitHub depuis la barre latérale (icône <span className="font-mono">+</span> à côté de chaque section).</p>
                <button onClick={() => {
                  ['explorer.recycle.v1', 'explorer.github.token', 'explorer.pinned.v1'].forEach((k) => localStorage.removeItem(k));
                  window.dispatchEvent(new CustomEvent('explorer:recycle-changed'));
                  alert('Caches locaux vidés.');
                }} className="h-7 px-3 rounded border border-border/40 hover:bg-[hsl(var(--explorer-hover))] text-[11px]">Purger les caches locaux</button>
              </div>
            )}
            {tab === 'advanced' && (
              <>
                <Field label="API Base"><span className="font-mono text-muted-foreground">{boot.apiBase || '(relatif)'}</span></Field>
                <Field label="État API">
                  <span className={cn('font-mono', apiOk === null && 'text-muted-foreground', apiOk === true && 'text-emerald-400', apiOk === false && 'text-red-400')}>
                    {apiOk === null ? '…test' : apiOk ? 'joignable' : 'injoignable'}
                  </span>
                </Field>
                <Field label="Plateforme"><span className="font-mono text-muted-foreground">{boot.platform || 'web'}</span></Field>
                <Field label="Utilisateur"><span className="font-mono text-muted-foreground">{boot.username || '—'}</span></Field>
                <Field label="Home"><span className="font-mono text-muted-foreground truncate max-w-[260px] inline-block">{boot.homedir || '—'}</span></Field>
              </>
            )}
            {tab === 'about' && (
              <div className="space-y-2 text-muted-foreground">
                <p className="text-foreground text-[13px]">Cognitive Explorer</p>
                <p>Un explorateur de fichiers pensé pour la productivité et le style. Midnight Indigo, glass surfaces, données réelles via l'API locale.</p>
                <p className="text-[11px]">Version 0.9 · Build UI</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-foreground/90">{label}</label>
      <div>{children}</div>
    </div>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Field label={label}>
      <button onClick={() => onChange(!checked)}
        className={cn('h-5 w-9 rounded-full transition-colors relative', checked ? 'bg-primary/70' : 'bg-[hsl(var(--muted))] border border-border/40')}>
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-foreground/90 transition-all', checked ? 'left-4' : 'left-0.5')} />
      </button>
    </Field>
  );
}

export function loadExplorerSettings(): SettingsState { return readSettings(); }
