import type { FileItem } from './fileExplorer';

export type ExplorerSourceType = 'mock' | 'local' | 'network' | 'ftp' | 'cloud';
export type ExplorerSourceStatus = 'connected' | 'configured' | 'disconnected' | 'error';

export interface ExplorerSource {
  id: string;
  type: ExplorerSourceType;
  name: string;
  root?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  status: ExplorerSourceStatus;
  readOnly: boolean;
  driveInfo?: {
    mount: string;
    total: number;
    used: number;
    usage: number;
    fsType?: string;
    label?: string;
    driveType?: number;
    providerName?: string;
    isNetwork?: boolean;
  };
}

export interface ExplorerSourceListResult {
  success: boolean;
  sourceId: string;
  path: string;
  items: FileItem[];
  error?: string;
}
