import { useState, useCallback, useRef } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { TerminalHeader, ShellProfile } from './terminal/TerminalHeader';
import { TerminalView } from './terminal/TerminalView';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  cwd: string;
  cwdName: string;
  cwdPath?: string;
  onClose: () => void;
  onCd: (folderId: string) => void;
  onMkdir: (name: string) => void;
  fill?: boolean;
  onOpenInTab?: () => void;
  sessionKey?: string;
}

interface PaneModel {
  id: string;
  profile: ShellProfile;
}

const PREFS_KEY = 'terminal.prefs.v1';

interface Prefs {
  ai: boolean;
  sound: boolean;
  profile: ShellProfile;
}

function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    return {
      ai: raw.ai ?? true,
      sound: raw.sound ?? true,
      profile: raw.profile || 'powershell',
    };
  } catch {
    return { ai: true, sound: true, profile: 'powershell' };
  }
}

function savePrefs(p: Prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function TerminalPanel({ open, cwd, cwdName, cwdPath, onClose, fill, onOpenInTab, sessionKey }: Props) {
  const initialPrefs = useRef(loadPrefs());
  const [ai, setAi] = useState(initialPrefs.current.ai);
  const [sound, setSound] = useState(initialPrefs.current.sound);
  const [profile, setProfile] = useState<ShellProfile>(initialPrefs.current.profile);

  const [panes, setPanes] = useState<PaneModel[]>([{ id: 'p1', profile: initialPrefs.current.profile }]);
  const [splitDir, setSplitDir] = useState<'horizontal' | 'vertical'>('horizontal');
  const [activePane, setActivePane] = useState('p1');
  const clearFns = useRef<Record<string, () => void>>({});
  const copyAllFns = useRef<Record<string, () => string>>({});
  const focusFns = useRef<Record<string, () => void>>({});

  const persist = (patch: Partial<Prefs>) => {
    const next = { ai, sound, profile, ...patch };
    savePrefs(next);
  };

  const toggleAi = () => { setAi((v) => { persist({ ai: !v }); return !v; }); };
  const toggleSound = () => { setSound((v) => { persist({ sound: !v }); return !v; }); };
  const changeProfile = (p: ShellProfile) => {
    setProfile(p);
    persist({ profile: p });
    // Update the active pane's profile
    setPanes((prev) => prev.map((pane) => pane.id === activePane ? { ...pane, profile: p } : pane));
  };

  const addPane = useCallback((dir: 'horizontal' | 'vertical') => {
    if (panes.length >= 4) return;
    setSplitDir(dir);
    const id = `p${Date.now().toString(36)}`;
    setPanes((prev) => [...prev, { id, profile }]);
    setActivePane(id);
  }, [panes.length, profile]);

  const closePane = useCallback((id: string) => {
    setPanes((prev) => {
      if (prev.length <= 1) { onClose(); return prev; }
      const next = prev.filter((p) => p.id !== id);
      if (activePane === id) setActivePane(next[0]?.id || '');
      return next;
    });
  }, [activePane, onClose]);

  const clearActive = () => clearFns.current[activePane]?.();
  const copyAll = () => {
    const text = copyAllFns.current[activePane]?.() || '';
    if (text) navigator.clipboard?.writeText(text);
  };

  if (!open) return null;

  const initialCwd = cwdPath || cwdName;
  const panelSessionKey = useRef(sessionKey || `panel-${btoa(unescape(encodeURIComponent(initialCwd))).slice(0, 32)}`);

  const renderPane = (pane: PaneModel, showClose: boolean) => (
    <div className="relative h-full w-full">
      {showClose && (
        <button
          onClick={() => closePane(pane.id)}
          className="absolute top-1 right-1 z-10 h-4 w-4 flex items-center justify-center rounded bg-background/60 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Fermer cette vue"
        >
          <X size={9} />
        </button>
      )}
      <TerminalView
        id={pane.id}
        initialCwd={initialCwd}
        profile={pane.profile}
        active={pane.id === activePane}
        onFocus={() => setActivePane(pane.id)}
        onClose={panes.length === 1 ? onClose : () => closePane(pane.id)}
        aiEnabled={ai}
        soundEnabled={sound}
        registerClear={(fn) => { clearFns.current[pane.id] = fn; }}
        registerCopyAll={(fn) => { copyAllFns.current[pane.id] = fn; }}
        registerFocusInput={(fn) => { focusFns.current[pane.id] = fn; }}
        sessionKey={`${panelSessionKey.current}:${pane.id}`}
      />
    </div>
  );

  return (
    <div className={cn(
      'bg-[hsl(var(--background))] flex flex-col shrink-0',
      fill ? 'h-full w-full' : 'h-full border-t border-border/40',
    )}>
      <TerminalHeader
        profile={panes.find((p) => p.id === activePane)?.profile || profile}
        onProfileChange={changeProfile}
        cwd={initialCwd}
        onSplitH={() => addPane('horizontal')}
        onSplitV={() => addPane('vertical')}
        onNewPane={() => addPane(splitDir)}
        onClearActive={clearActive}
        onCopyAll={copyAll}
        onFind={() => focusFns.current[activePane]?.()}
        paneCount={panes.length}
        aiEnabled={ai}
        onToggleAi={toggleAi}
        soundEnabled={sound}
        onToggleSound={toggleSound}
        onClose={onClose}
        onOpenInTab={onOpenInTab}
        running={false}
      />

      <div className="flex-1 min-h-0">
        {panes.length === 1 ? (
          renderPane(panes[0], false)
        ) : (
          <ResizablePanelGroup direction={splitDir}>
            {panes.flatMap((pane, i) => {
              const el = (
                <ResizablePanel key={pane.id} defaultSize={100 / panes.length} minSize={15}>
                  <div className="group h-full w-full">
                    {renderPane(pane, panes.length > 1)}
                  </div>
                </ResizablePanel>
              );
              return i < panes.length - 1
                ? [el, <ResizableHandle key={`h-${pane.id}`} />]
                : [el];
            })}
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
