export type FileType = 'folder' | 'image' | 'document' | 'video' | 'audio' | 'code' | 'archive' | 'executable' | 'text' | 'pdf' | 'spreadsheet' | 'presentation' | 'font' | 'database' | 'unknown';

export interface FileItem {
  id: string;
  path?: string;
  targetPath?: string;
  name: string;
  type: FileType;
  extension?: string;
  size?: number;
  dateModified: Date;
  dateCreated: Date;
  parentId: string | null;
  children?: string[];
  isHidden?: boolean;
  isFavorite?: boolean;
  tags?: string[];
  thumbnail?: string;
  isReadOnly?: boolean;
  driveInfo?: {
    mount: string;
    total: number;
    used: number;
    usage: number;
    fsType?: string;
    label?: string;
  };
}

export interface DriveInfo {
  id: string;
  name: string;
  label: string;
  letter: string;
  totalSpace: number;
  usedSpace: number;
  type: 'local' | 'removable' | 'network' | 'optical' | 'cloud';
  fileSystem: string;
  rootId: string;
}

export interface NetworkLocation {
  id: string;
  name: string;
  path: string;
  type: 'cloud' | 'ftp' | 'smb' | 'webdav';
  status: 'connected' | 'disconnected' | 'syncing';
  rootId: string;
}

export type ExplorerLocation =
  | { type: 'directory'; folderId: string }
  | { type: 'virtual'; id: 'this-pc' | 'network' | 'trash' | 'quick-access' }
  | { type: 'search'; query: string; baseFolderId?: string };

export type ViewMode = 'grid-large' | 'grid-medium' | 'grid-small' | 'list' | 'details' | 'tiles' | 'content';

export type SortField = 'name' | 'size' | 'type' | 'dateModified' | 'dateCreated';
export type SortDirection = 'asc' | 'desc';

export interface NavigationState {
  location: ExplorerLocation;
  currentPath: string[];
  currentFolderId: string;
  history: ExplorerLocation[];
  historyIndex: number;
  selectedItems: string[];
  selectionAnchor: string | null;
  viewMode: ViewMode;
  sortField: SortField;
  sortDirection: SortDirection;
  searchQuery: string;
  showPreview: boolean;
  iconSize: number;
  expandedNodes: Set<string>;
  renamingId: string | null;
}

export interface ClipboardState {
  items: string[];
  operation: 'copy' | 'cut' | null;
}
