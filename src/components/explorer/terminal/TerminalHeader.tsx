import { TerminalSquare, X, Minus, Maximize2, SplitSquareHorizontal, SplitSquareVertical, Plus, Sparkles, Volume2, VolumeX, Eraser, Search, Settings2, MoreVertical, Copy as CopyIcon, Keyboard, MessageSquare, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModelPicker } from './ModelPicker';
import { AiSettingsDialog } from './AiSettingsDialog';
import { useState } from 'react';
import { isKeySoundEnabled, setKeySoundEnabled } from '@/lib/sounds';

export type ShellProfile = 'powershell' | 'bash' | 'cmd' | 'node' | 'python';

export const PROFILES: { id: ShellProfile; label: string; badge: string; color: string }[] = [
  { id: 'powershell', label: 'PowerShell', badge: 'PS', color: 'text-emerald-300' },
  { id: 'bash', label: 'Bash', badge: 'sh', color: 'text-lime-300' },
  { id: 'cmd', label: 'cmd', badge: 'cmd', color: 'text-sky-300' },
  { id: 'node', label: 'Node REPL', badge: 'node', color: 'text-green-400' },
  { id: 'python', label: 'Python REPL', badge: 'py', color: 'text-yellow-300' },
];

interface Props {
  profile: ShellProfile;
  onProfileChange: (p: ShellProfile) => void;
  cwd: string;
  onSplitH: () => void;
  onSplitV: () => void;
  onNewPane: () => void;
  onClearActive: () => void;
  onFind: () => void;
  onCopyAll: () => void;
  paneCount: number;
  aiEnabled: boolean;
  onToggleAi: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClose: () => void;
  onOpenInTab?: () => void;
  running: boolean;
  chatOpen?: boolean;
  onToggleChat?: () => void;
}

export function TerminalHeader(props: Props) {
  const [profOpen, setProfOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [keySound, setKeySoundState] = useState(isKeySoundEnabled());
  const profile = PROFILES.find((p) => p.id === props.profile) || PROFILES[0];
  const toggleKeySound = () => { const n = !keySound; setKeySoundState(n); setKeySoundEnabled(n); };

  const iconBtn = 'h-5 w-5 flex items-center justify-center rounded hover:bg-[hsl(var(--explorer-hover))] transition-colors';

  return (
    <div className="flex items-center gap-1.5 px-2 h-7 bg-[hsl(var(--explorer-surface))] border-b border-border/30 shrink-0 relative">
      {/* Live status pulse */}
      <div className="relative shrink-0">
        <TerminalSquare size={12} className={cn(profile.color, 'transition-colors')} />
        {props.running && (
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
      </div>

      {/* Profile picker */}
      <button
        onClick={() => setProfOpen((v) => !v)}
        className="text-[10px] font-mono px-1.5 h-5 rounded hover:bg-[hsl(var(--explorer-hover))] flex items-center gap-1"
        title="Changer de profil de shell"
      >
        <span className={profile.color}>{profile.badge}</span>
      </button>
      {profOpen && (
        <div className="absolute top-7 left-2 z-50 glass-menu rounded-lg py-1 min-w-[160px] shadow-2xl border border-border/40 animate-fade-in">
          {PROFILES.map((p) => (
            <button
              key={p.id}
              onClick={() => { props.onProfileChange(p.id); setProfOpen(false); }}
              className={cn(
                'w-full text-left px-2.5 py-1 text-[11px] hover:bg-[hsl(var(--explorer-hover))] flex items-center gap-2',
                p.id === props.profile && 'bg-primary/10 text-foreground',
              )}
            >
              <span className={cn('font-mono w-8', p.color)}>{p.badge}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      )}

      <span className="text-[11px] font-mono text-muted-foreground truncate min-w-0">
        <span className="text-foreground/80">{props.cwd}</span>
      </span>

      <div className="flex-1" />

      <ModelPicker onOpenSettings={() => setAiSettingsOpen(true)} />
      <button onClick={() => setAiSettingsOpen(true)} className={iconBtn} title="Paramètres IA · fournisseurs, clés, auto-switch">
        <Sliders size={11} />
      </button>

      {/* Toolbar buttons */}
      {props.onToggleChat && (
        <button
          onClick={props.onToggleChat}
          className={cn(iconBtn, props.chatOpen && 'bg-indigo-500/20 text-indigo-300')}
          title={props.chatOpen ? 'Fermer le chat IA' : 'Ouvrir le chat IA'}
        >
          <MessageSquare size={11} />
        </button>
      )}
      <button onClick={props.onFind} className={iconBtn} title="Rechercher (Ctrl+F)">
        <Search size={11} />
      </button>
      <button onClick={props.onClearActive} className={iconBtn} title="Effacer la vue active (Ctrl+L)">
        <Eraser size={11} />
      </button>
      <button
        onClick={props.onToggleAi}
        className={cn(iconBtn, props.aiEnabled && 'bg-primary/20 text-primary')}
        title="Suggestions IA de la commande suivante"
      >
        <Sparkles size={11} />
      </button>
      <button
        onClick={props.onToggleSound}
        className={cn(iconBtn, !props.soundEnabled && 'text-muted-foreground/50')}
        title={props.soundEnabled ? 'Couper les sons UI' : 'Activer les sons UI'}
      >
        {props.soundEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
      </button>
      <button
        onClick={toggleKeySound}
        className={cn(iconBtn, keySound ? 'bg-primary/20 text-primary' : 'text-muted-foreground/50')}
        title={keySound ? 'Sons de frappe : activés' : 'Sons de frappe : coupés'}
      >
        <Keyboard size={11} />
      </button>

      <div className="w-px h-4 bg-border/40 mx-0.5" />

      <button onClick={props.onSplitH} className={iconBtn} title="Diviser à droite">
        <SplitSquareHorizontal size={11} />
      </button>
      <button onClick={props.onSplitV} className={iconBtn} title="Diviser en bas">
        <SplitSquareVertical size={11} />
      </button>
      <button onClick={props.onNewPane} className={iconBtn} title="Nouvelle vue">
        <Plus size={11} />
      </button>

      <div className="w-px h-4 bg-border/40 mx-0.5" />

      <button onClick={() => setMoreOpen((v) => !v)} className={iconBtn} title="Plus">
        <MoreVertical size={11} />
      </button>
      {moreOpen && (
        <div className="absolute top-7 right-16 z-50 glass-menu rounded-lg py-1 min-w-[200px] shadow-2xl border border-border/40 animate-fade-in">
          <MenuItem icon={CopyIcon} label="Copier tout le buffer" onClick={() => { props.onCopyAll(); setMoreOpen(false); }} />
          <MenuItem icon={Settings2} label={`Sons : ${props.soundEnabled ? 'activés' : 'coupés'}`} onClick={() => { props.onToggleSound(); setMoreOpen(false); }} />
          <MenuItem icon={Sparkles} label={`IA : ${props.aiEnabled ? 'activée' : 'désactivée'}`} onClick={() => { props.onToggleAi(); setMoreOpen(false); }} />
          <div className="h-px bg-border/40 my-1" />
          <div className="px-2.5 py-1 text-[9px] uppercase text-muted-foreground font-mono">Vues : {props.paneCount}</div>
        </div>
      )}

      {props.onOpenInTab && (
        <button onClick={props.onOpenInTab} className={iconBtn} title="Ouvrir dans un onglet">
          <Maximize2 size={10} />
        </button>
      )}
      <button onClick={props.onClose} className={iconBtn} title="Réduire">
        <Minus size={11} />
      </button>
      <button onClick={props.onClose} className={cn(iconBtn, 'hover:bg-red-500/20 hover:text-red-400')} title="Fermer">
        <X size={11} />
      </button>
      <AiSettingsDialog open={aiSettingsOpen} onClose={() => setAiSettingsOpen(false)} />
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-2.5 py-1 text-[11px] hover:bg-[hsl(var(--explorer-hover))] text-left">
      <Icon size={11} className="text-muted-foreground" />
      <span>{label}</span>
    </button>
  );
}
