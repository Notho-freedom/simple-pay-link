import { useState } from 'react';
import { LocalServer } from '@/data/localServers';
import { ArrowLeft, Globe, Play, Square, RotateCw, Copy, Send, ExternalLink, Activity, Cpu, Clock, Hash, Terminal as TerminalIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSound } from '@/hooks/useSound';
import { openContextMenu } from '@/lib/contextMenuBus';

const methodColor: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  POST: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  PUT: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  DELETE: 'bg-red-500/15 text-red-300 border-red-500/30',
  PATCH: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

interface Props {
  server: LocalServer;
  onBack: () => void;
}

export function LocalServerDetail({ server, onBack }: Props) {
  const { play } = useSound();
  const [activeRouteId, setActiveRouteId] = useState<string | null>(server.routes[0]?.path || null);
  const activeRoute = server.routes.find((r) => r.path === activeRouteId);

  const copy = (s: string) => { navigator.clipboard?.writeText(s); toast.success('Copié'); };

  return (
    <div
      className="flex-1 overflow-auto"
      onContextMenu={(e) => openContextMenu(e, {
        isBackground: false, isServer: true,
        serverKind: 'http', serverRunning: server.status === 'running',
        file: null, hasClipboard: false, selectedCount: 0, targetId: server.id,
      }, (id) => {
        if (id === 'server.browser' || id === 'open') window.open(server.url, '_blank');
        else if (id === 'copy.url') { navigator.clipboard?.writeText(server.url); toast.success('URL copiée'); }
        else if (id === 'server.stop') toast(`${server.name} arrêté (mock)`);
        else if (id === 'server.start') toast.success(`${server.name} démarré (mock)`);
        else if (id === 'server.restart') toast(`${server.name} relancé (mock)`);
        else if (id === 'server.logs') toast.info('Logs (mock)');
      })}
    >
      {/* Header */}
      <div className="border-b border-border/30 bg-[hsl(var(--explorer-surface))]">
        <div className="px-6 pt-4 pb-3">
          <button onClick={onBack} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-3 font-mono flex items-center gap-1">
            <ArrowLeft size={11} /> retour aux serveurs
          </button>
          <div className="flex items-start gap-3">
            <div className={cn(
              'w-12 h-12 rounded-md flex items-center justify-center shrink-0',
              server.status === 'running' ? 'bg-emerald-500/15 text-emerald-400' :
              server.status === 'stopped' ? 'bg-muted text-muted-foreground' :
              'bg-red-500/15 text-red-400'
            )}>
              <Globe size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[16px] font-normal">{server.name}</h2>
                <span className={cn(
                  'text-[9px] uppercase tracking-wider px-1.5 py-px rounded font-mono',
                  server.status === 'running' && 'bg-emerald-500/15 text-emerald-300',
                  server.status === 'stopped' && 'bg-muted text-muted-foreground',
                  server.status === 'error' && 'bg-red-500/15 text-red-300'
                )}>{server.status}</span>
                <span className="text-[10px] font-mono text-muted-foreground">:{server.port}</span>
              </div>
              <p className="text-[12px] text-muted-foreground font-light mt-1">{server.description}</p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-mono">
                <code className="px-2 py-0.5 rounded bg-muted text-foreground/90">{server.url}</code>
                <button onClick={() => copy(server.url)} className="h-5 w-5 flex items-center justify-center rounded hover:bg-[hsl(var(--explorer-hover))]">
                  <Copy size={10} />
                </button>
                <button onClick={() => window.open(server.url, '_blank')} className="h-5 w-5 flex items-center justify-center rounded hover:bg-[hsl(var(--explorer-hover))]">
                  <ExternalLink size={10} />
                </button>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {server.status === 'running' ? (
                <button onClick={() => { play('click'); toast(`Serveur ${server.name} arrêté (mock)`); }}
                  className="h-7 px-2.5 flex items-center gap-1.5 text-[11px] rounded border border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <Square size={11} /> Stop
                </button>
              ) : (
                <button onClick={() => { play('click'); toast.success(`Serveur ${server.name} démarré (mock)`); }}
                  className="h-7 px-2.5 flex items-center gap-1.5 text-[11px] rounded border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  <Play size={11} /> Start
                </button>
              )}
              <button onClick={() => { play('click'); toast(`Serveur ${server.name} relancé (mock)`); }}
                className="h-7 px-2.5 flex items-center gap-1.5 text-[11px] rounded border border-border/40 hover:border-primary/40 hover:bg-[hsl(var(--explorer-hover))]">
                <RotateCw size={11} /> Restart
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5 mt-3 text-[11px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1"><Cpu size={11} /> {server.framework}</span>
            <span className="flex items-center gap-1"><Hash size={11} /> PID {server.pid || '—'}</span>
            <span className="flex items-center gap-1"><Clock size={11} /> {server.uptime}</span>
            <span className="flex items-center gap-1"><Activity size={11} className="text-emerald-400/70" /> {server.routes.length} routes</span>
          </div>
        </div>
      </div>

      {server.routes.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <TerminalIcon size={32} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-[12px] text-muted-foreground font-light">Service non-HTTP — aucune route à inspecter.</p>
            <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{server.url}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 p-4">
          {/* Routes list */}
          <div className="lg:col-span-1 rounded-md border border-border/40 bg-[hsl(var(--explorer-surface))] overflow-hidden max-h-[60vh]">
            <div className="px-3 py-2 border-b border-border/30 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Routes API
            </div>
            <div className="overflow-y-auto max-h-[55vh]">
              {server.routes.map((r) => (
                <button
                  key={r.path}
                  onClick={() => setActiveRouteId(r.path)}
                  className={cn(
                    'flex items-start gap-2 px-3 py-2 w-full text-left hover:bg-[hsl(var(--explorer-hover))] border-b border-border/20 last:border-0',
                    activeRouteId === r.path && 'bg-[hsl(var(--explorer-selected))]'
                  )}
                >
                  <span className={cn('text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 mt-px', methodColor[r.method])}>
                    {r.method}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-mono truncate">{r.path}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{r.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Route detail / tester */}
          <div className="lg:col-span-2 rounded-md border border-border/40 bg-[hsl(var(--explorer-surface))] overflow-hidden">
            {!activeRoute ? (
              <p className="p-6 text-center text-[12px] text-muted-foreground">Sélectionnez une route</p>
            ) : (
              <RouteTester key={activeRoute.path} server={server} route={activeRoute} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RouteTester({ server, route }: { server: LocalServer; route: LocalServer['routes'][number] }) {
  const { play } = useSound();
  const [params, setParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fullUrl = `${server.url}${route.path}`;

  const send = () => {
    play('click');
    setLoading(true);
    setResponse(null);
    setTimeout(() => {
      setLoading(false);
      const mock = {
        status: route.method === 'POST' ? 201 : 200,
        timestamp: new Date().toISOString(),
        method: route.method,
        path: route.path,
        params,
        data: route.method === 'GET' ? { id: 'a3f9c21', name: 'Sample', count: 42 } : { success: true },
      };
      setResponse(JSON.stringify(mock, null, 2));
    }, 600 + Math.random() * 800);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn('text-[10px] font-mono px-2 py-0.5 rounded border', methodColor[route.method])}>{route.method}</span>
          <code className="text-[12px] font-mono flex-1 truncate">{fullUrl}</code>
          <button onClick={send} disabled={loading} className="h-7 px-3 flex items-center gap-1.5 text-[11px] rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 disabled:opacity-50">
            <Send size={11} /> {loading ? 'Envoi…' : 'Tester'}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground font-light">{route.description}</p>
      </div>

      {route.params && route.params.length > 0 && (
        <div className="px-4 py-3 border-b border-border/30">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">Paramètres</div>
          <div className="space-y-2">
            {route.params.map((p) => (
              <div key={p.name} className="grid grid-cols-[120px_1fr] gap-2 items-start">
                <div>
                  <div className="text-[11px] font-mono">
                    {p.name}
                    {p.required && <span className="text-red-400 ml-0.5">*</span>}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-mono">{p.type}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    value={params[p.name] || ''}
                    onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
                    placeholder={p.description}
                    className="h-7 px-2 text-[11px] font-mono bg-muted border border-border/30 rounded outline-none focus:border-primary/40 allow-select"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 px-4 py-3 overflow-auto">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">Réponse</div>
        {response ? (
          <pre className="text-[10px] font-mono bg-[hsl(var(--background))] border border-border/30 rounded p-3 whitespace-pre-wrap break-all max-h-64 overflow-auto allow-select">
            {response}
          </pre>
        ) : (
          <p className="text-[11px] text-muted-foreground/60 font-light italic">Aucune requête envoyée</p>
        )}
      </div>
    </div>
  );
}
