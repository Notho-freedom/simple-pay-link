/**
 * Backwards-compatible surface used by the explorer to talk to the host system.
 * All operations are now HTTP-based (see src/lib/apiClient.ts) — Electron IPC is
 * gone. The Electron shell simply forwards system params via the URL and spawns
 * the same HTTP server the browser dev mode uses.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, apiUrl, getBootParams } from '@/lib/apiClient';

export interface SystemInfo {
  platform: string;
  arch: string;
  hostname: string;
  username: string;
  homedir: string;
  tmpdir?: string;
  cpus?: number;
  memory?: { total: number; free: number };
  uptime?: number;
}

export interface DirItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  modified: Date | string | null;
}

export interface DirListResult {
  success: boolean;
  path: string;
  items: DirItem[];
  data?: DirItem[];
  requestId?: string;
  error?: string;
}

export interface CacheBackedPayload<T> {
  success: boolean;
  data: T;
  status?: 'ready' | 'loading' | 'error';
  error?: string;
}

export function useSystemBridge() {
  const boot = getBootParams();
  const [isAvailable, setIsAvailable] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(() => (
    boot.platform ? {
      platform: boot.platform,
      arch: '',
      hostname: boot.hostname || '',
      username: boot.username || '',
      homedir: boot.homedir || '',
    } : null
  ));

  useEffect(() => {
    let cancelled = false;
    void api.get<{ success: boolean; data: SystemInfo }>('/api/system/info').then((r) => {
      if (cancelled) return;
      if (r?.success) { setSystemInfo(r.data); setIsAvailable(true); }
    }).catch(() => { /* API unavailable → web-only mode */ });
    return () => { cancelled = true; };
  }, []);

  const listDir = useCallback<(path: string, opts?: { showHidden?: boolean; requestId?: string }) => Promise<DirListResult>>(
    async (path, opts) => {
      try {
        const url = new URL(apiUrl('/api/fs/list'), window.location.origin);
        url.searchParams.set('path', path);
        if (opts?.showHidden) url.searchParams.set('showHidden', '1');
        const res = await fetch(url.toString());
        const body = await res.json();
        return { ...body, requestId: opts?.requestId, data: body.items };
      } catch (err) {
        return { success: false, path, items: [], error: err instanceof Error ? err.message : 'unavailable' };
      }
    }, []);

  const getDrives = useCallback(async (): Promise<CacheBackedPayload<any[]>> => {
    try { const r = await api.get<CacheBackedPayload<any[]>>('/api/system/drives'); return { success: r.success, data: r.data || [] }; }
    catch { return { success: false, data: [], error: 'unavailable' }; }
  }, []);

  const getNetworkMounts = useCallback(async (): Promise<CacheBackedPayload<any[]>> => {
    try {
      const r = await api.get<{ success: boolean; data: { interfaces: any[] } }>('/api/system/network');
      return { success: r.success, data: (r.data?.interfaces || []).map((i) => ({ name: i.name, displayRoot: i.address })) };
    } catch { return { success: false, data: [] }; }
  }, []);

  const getListeningServices = useCallback(async (): Promise<CacheBackedPayload<any[]>> => ({ success: true, data: [] }), []);

  const invalidateExplorerDirCache = useCallback(async (path: string) => ({ success: true, path }), []);
  const watchDir = useCallback((_path: string, _cb: (e: any) => void) => () => {}, []);

  const exec = useCallback(async (_command: string) => ({ success: false, stdout: '', stderr: 'exec disabled', exitCode: -1, duration: 0 }), []);
  const readFile = useCallback(async (_p: string) => ({ success: false, path: _p, error: 'not-implemented' }), []);
  const writeFile = useCallback(async (_p: string, _c: string) => ({ success: false, path: _p, error: 'not-implemented' }), []);

  const mkdir  = useCallback(async (p: string) => api.post<{ success: boolean; error?: string }>('/api/fs/mkdir',  { path: p }), []);
  const rename = useCallback(async (from: string, to: string) => api.post<{ success: boolean; error?: string }>('/api/fs/rename', { from, to }), []);
  const copy   = useCallback(async (from: string, to: string) => api.post<{ success: boolean; error?: string }>('/api/fs/copy',   { from, to }), []);
  const move   = useCallback(async (from: string, to: string) => api.post<{ success: boolean; error?: string }>('/api/fs/move',   { from, to }), []);
  const openShell = useCallback(async (path: string) => api.post<{ success: boolean }>('/api/fs/open', { path }), []);

  // Legacy stubs kept so the icon resolver / older code doesn't crash if referenced.
  const getFileIcon  = useCallback(async (_p: string) => ({ success: false, path: _p, error: 'not-supported' }), []);
  const getFileIcons = useCallback(async (_e: any[]) => ({ success: false, icons: [] as any[] }), []);
  const openExternal = useCallback(async (url: string) => { window.open(url, '_blank'); return { success: true }; }, []);

  return useMemo(() => ({
    isAvailable, systemInfo,
    exec, readFile, writeFile,
    listDir, watchDir, invalidateExplorerDirCache,
    getDrives, getNetworkMounts, getListeningServices,
    mkdir, rename, copy, move,
    openShell, openExternal,
    getFileIcon, getFileIcons,
  }), [
    isAvailable, systemInfo, exec, readFile, writeFile, listDir, watchDir,
    invalidateExplorerDirCache, getDrives, getNetworkMounts, getListeningServices,
    mkdir, rename, copy, move, openShell, openExternal, getFileIcon, getFileIcons,
  ]);
}
