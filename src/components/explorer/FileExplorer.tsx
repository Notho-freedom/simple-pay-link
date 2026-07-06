import { useState, useCallback, useEffect } from 'react';
import { ExplorerToaster } from './ExplorerToasts';
import { TooltipProvider } from '@/components/ui/tooltip';
import { I18nProvider, useI18n, Locale } from '@/i18n/LanguageContext';
import { TabBar, TabState } from './TabBar';
import { ExplorerTab } from './ExplorerTab';
import { TerminalPanel } from './TerminalPanel';
import { SplitView } from './SplitView';
import { CommandPalette } from './CommandPalette';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';
import './explorer.css';

export interface FileExplorerProps {
  /** Real system path to open when running with the Electron bridge. */
  initialPath?: string;
  /** Increment to force the active embedded tab to sync to initialPath. */
  openToken?: number;
  /** Visual embedding mode. Standalone keeps NextGen chrome; Cognitive Stream supplies its own frame. */
  embeddedMode?: 'standalone' | 'cognitive-stream';
  /** Folder id to open the first tab in. Defaults to the virtual "This PC" view. */
  initialFolderId?: string;
  /** UI language. Defaults to 'fr'. */
  initialLocale?: Locale;
  /** Show the tab bar with mock window controls. Defaults to true. */
  showWindowChrome?: boolean;
  /** Optional wrapper className (e.g. height/width). */
  className?: string;
  /** Optional close handler used by hosts such as Cognitive Stream. */
  onClose?: () => void;
  /** Called whenever a file is opened (double-click on non-folder). */
  onFileOpen?: (folderId: string) => void;
  /** Called whenever the active tab navigates to a new folder. */
  onNavigate?: (folderId: string) => void;
}

interface TerminalTabMeta { cwdName?: string; cwdPath?: string; sessionKey?: string }

function makeId() {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function ExplorerInner({
  initialFolderId = 'root',
  initialPath,
  openToken = 0,
  onNavigate,
}: {
  initialFolderId?: string;
  initialPath?: string;
  openToken?: number;
  onNavigate?: (id: string) => void;
}) {
  const { locale, setLocale } = useI18n();
  const { play } = useSound();
  const [tabs, setTabs] = useState<TabState[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('explorer.tabs.v1') || 'null') as TabState[] | null;
      if (saved?.length) return saved;
    } catch { /* ignore */ }
    return [{ id: makeId(), folderId: initialFolderId }];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('explorer.activeTab.v1');
      if (saved) return saved;
    } catch { /* ignore */ }
    return tabs[0].id;
  });
  const [split, setSplit] = useState<{ leftFolderId: string; rightFolderId: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem('explorer.split.v1') || 'null'); } catch { return null; }
  });
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('explorer.tabs.v1', JSON.stringify(tabs));
      localStorage.setItem('explorer.activeTab.v1', activeId);
    } catch { /* ignore */ }
  }, [activeId, tabs]);

  useEffect(() => {
    try {
      if (split) localStorage.setItem('explorer.split.v1', JSON.stringify(split));
      else localStorage.removeItem('explorer.split.v1');
    } catch { /* ignore */ }
  }, [split]);

  const newTab = useCallback(
    (folderId: string = 'root', kind: 'explorer' | 'terminal' = 'explorer', terminal?: TerminalTabMeta) => {
      const id = makeId();
      setTabs((prev) => [...prev, { id, folderId, kind, ...terminal }]);
      setActiveId(id);
      play('tab-new');
    },
    [play]
  );

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const idx = prev.findIndex((t) => t.id === id);
        const next = prev.filter((t) => t.id !== id);
        if (id === activeId) setActiveId(next[Math.max(0, idx - 1)].id);
        return next;
      });
    },
    [activeId]
  );

  // Global events: open new tab (folder), open terminal tab
  useEffect(() => {
    const onNewTab = (e: Event) => {
      const folderId = (e as CustomEvent<{ folderId?: string }>).detail?.folderId || 'root';
      newTab(folderId, 'explorer');
    };
    const onNewTerm = (e: Event) => {
      const detail = (e as CustomEvent<TerminalTabMeta>).detail || {};
      newTab('root', 'terminal', { ...detail, sessionKey: detail.sessionKey || `tab-${Date.now().toString(36)}` });
    };
    const onOpenRight = (e: Event) => {
      const detail = (e as CustomEvent<{ leftFolderId?: string; rightFolderId?: string }>).detail || {};
      setSplit({ leftFolderId: detail.leftFolderId || tabs.find((t) => t.id === activeId)?.folderId || 'root', rightFolderId: detail.rightFolderId || 'root' });
    };
    window.addEventListener('explorer:new-tab', onNewTab);
    window.addEventListener('explorer:new-terminal-tab', onNewTerm);
    window.addEventListener('explorer:open-right', onOpenRight);
    return () => {
      window.removeEventListener('explorer:new-tab', onNewTab);
      window.removeEventListener('explorer:new-terminal-tab', onNewTerm);
      window.removeEventListener('explorer:open-right', onOpenRight);
    };
  }, [activeId, newTab, tabs]);

  // Global shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (ctrl && e.key.toLowerCase() === 't') {
        e.preventDefault();
        newTab();
      }
      if (ctrl && e.key.toLowerCase() === 'w' && tabs.length > 1) {
        e.preventDefault();
        closeTab(activeId);
      }
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'w' && split) {
        e.preventDefault();
        setSplit(null);
      }
      if (ctrl && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (tabs[idx]) {
          e.preventDefault();
          setActiveId(tabs[idx].id);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeId, tabs, newTab, closeTab, split]);

  const handleFolderChange = useCallback(
    (tabId: string, folderId: string) => {
      const currentTab = tabs.find((tab) => tab.id === tabId);
      if (currentTab?.folderId === folderId) return;
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, folderId } : t)));
      if (tabId === activeId) onNavigate?.(folderId);
    },
    [activeId, onNavigate, tabs]
  );

  return (
    <>
      <TabBar tabs={tabs} activeId={activeId} onActivate={setActiveId} onClose={closeTab} onNew={() => newTab()} />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {split ? (
          <SplitView
            leftFolderId={split.leftFolderId}
            rightFolderId={split.rightFolderId}
            onLeftFolderChange={(id) => setSplit((prev) => prev ? { ...prev, leftFolderId: id } : prev)}
            onRightFolderChange={(id) => setSplit((prev) => prev ? { ...prev, rightFolderId: id } : prev)}
            onOpenCommandPalette={() => setCmdOpen(true)}
          />
        ) : tabs.map((tab) => {
          const isActive = tab.id === activeId;
          if (!isActive) return null;
          if (tab.kind === 'terminal') {
            return (
              <TerminalPanel
                key={tab.id}
                open
                fill
                cwd="root"
                cwdName={(tab as any).cwdName || "Terminal"}
                cwdPath={(tab as any).cwdPath}
                sessionKey={(tab as any).sessionKey || tab.id}
                onClose={() => closeTab(tab.id)}
                onCd={() => { /* noop in tab mode */ }}
                onMkdir={() => { /* noop in tab mode */ }}
              />
            );
          }
          return (
            <ExplorerTab
              key={tab.id}
              active={isActive}
              initialFolderId={tab.folderId}
              onFolderChange={(fid) => handleFolderChange(tab.id, fid)}
              onOpenCommandPalette={() => setCmdOpen(true)}
            />
          );
        })}
      </div>

      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        onNavigate={(id) => {
          window.dispatchEvent(new CustomEvent('explorer-nav', { detail: { id } }));
        }}
        onTogglePreview={() => window.dispatchEvent(new CustomEvent('explorer-toggle-preview'))}
        onToggleHidden={() => window.dispatchEvent(new CustomEvent('explorer-toggle-hidden'))}
        onToggleLanguage={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
      />
    </>
  );
}

/**
 * `<FileExplorer />` — drop-in file explorer.
 *
 * Standalone usage:
 *   <FileExplorer />
 *
 * Embedded with custom height:
 *   <FileExplorer className="h-[600px]" initialLocale="en" />
 *
 * To port into another project, copy:
 *   - src/components/explorer/
 *   - src/hooks/{useFileExplorer,useFileOperations,useSound,useMarqueeSelection,useDragDrop,useGlobalClipboard,useNotifications}.ts
 *   - src/data/{mockFileSystem,localServers}.ts
 *   - src/types/fileExplorer.ts
 *   - src/lib/{sounds,iconCache,utils}.ts
 *   - src/i18n/
 *   - public/sounds/
 *   - shadcn/ui primitives used (button, dropdown-menu, dialog, sheet, popover, tooltip, slider, command, resizable, sonner, toast)
 */
export function FileExplorer({
  initialPath,
  openToken = 0,
  embeddedMode = 'standalone',
  initialFolderId = 'root',
  initialLocale = 'fr',
  showWindowChrome = true,
  className,
  onFileOpen,
  onNavigate,
}: FileExplorerProps = {}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <TooltipProvider delayDuration={400}>
        <div
          className={cn(
            'explorer-root flex flex-col bg-background overflow-hidden text-foreground',
            !className && 'h-screen',
            className
          )}
        >
          {showWindowChrome && embeddedMode === 'standalone' ? (
            <ExplorerInner initialFolderId={initialFolderId} initialPath={initialPath} openToken={openToken} onNavigate={onNavigate} />
          ) : (
            <ExplorerInner
              initialFolderId={initialFolderId}
              initialPath={initialPath}
              openToken={openToken}
              onNavigate={onNavigate}
            />
          )}
          {embeddedMode !== 'standalone' && !showWindowChrome && false && (
            <ExplorerTab
              active
              initialFolderId={initialFolderId}
              onFolderChange={(fid) => onNavigate?.(fid)}
              onOpenCommandPalette={() => {}}
            />
          )}
        </div>
        <ExplorerToaster />
      </TooltipProvider>
    </I18nProvider>
  );
}
