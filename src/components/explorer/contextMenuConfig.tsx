import {
  Eye, Scissors, Copy, ClipboardPaste, Pencil, Trash2, Info,
  FolderPlus, FolderOpen, AppWindow, FileText, Globe, Image as ImageIcon,
  Send, Mail, FileArchive, ClipboardCopy, TerminalSquare, Play, Pause,
  Edit3, Crop, Palette, Code, Download, Share2, Star, RefreshCw,
  Wand2, Music, Film, ExternalLink, Pin, PinOff, Disc, HardDrive,
  Wifi, WifiOff, Settings, Plus, FolderInput, X, Columns2,
  GitBranch, GitPullRequest, History, Lock, Unlock, Square, RotateCw,
  Smartphone, Battery, Power, Database, Server,
  Search, Bookmark, Layers, Sparkles, Monitor, RotateCcw,
} from 'lucide-react';
import { FileItem } from '@/types/fileExplorer';

export type CtxItem =
  | { kind: 'item'; icon: any; label: string; id: string; shortcut?: string; danger?: boolean; disabled?: boolean }
  | { kind: 'sep' }
  | { kind: 'submenu'; icon: any; label: string; items: Array<{ icon: any; label: string; id: string }> }
  | { kind: 'header-actions'; items: Array<{ icon: any; label: string; id: string; danger?: boolean }> };

export type DriveKind = 'system' | 'data' | 'removable' | 'optical';
export type NetworkKind = 'gdrive' | 'onedrive' | 'smb' | 'ftp' | 'cloud';
export type ServerKind = 'http' | 'db' | 'cache' | 'storage';

export interface CtxContext {
  isBackground: boolean;
  isDesktop?: boolean;
  isSidebarItem?: boolean;
  isQuickAccess?: boolean;
  isDrive?: boolean;
  driveKind?: DriveKind;
  driveLetter?: string;
  isNetwork?: boolean;
  networkKind?: NetworkKind;
  isRepo?: boolean;
  isServer?: boolean;
  serverKind?: ServerKind;
  serverRunning?: boolean;
  isMobileDevice?: boolean;
  isMobileFolder?: boolean;
  isTerminal?: boolean;
  isGithubRepoCard?: boolean;
  isGithubTreeItem?: boolean;
  githubItemType?: 'file' | 'dir';
  file?: FileItem | null;
  hasClipboard: boolean;
  selectedCount: number;
  // For sidebar items, the resolved id useful to dispatch actions on
  targetId?: string;
}

const openWith = (...apps: Array<{ icon: any; label: string; id: string }>) => ({
  kind: 'submenu' as const, icon: AppWindow, label: 'Ouvrir avec', items: apps,
});

const sendTo = (extra: Array<{ icon: any; label: string; id: string }> = []): CtxItem => ({
  kind: 'submenu', icon: Send, label: 'Envoyer vers', items: [
    { icon: FolderOpen, label: 'Bureau (raccourci)', id: 'send.desktop' },
    { icon: FileArchive, label: 'Dossier compressé (.zip)', id: 'send.zip' },
    { icon: Mail, label: 'Destinataire de courrier', id: 'send.mail' },
    ...extra,
  ],
});

const compressTo: CtxItem = {
  kind: 'submenu', icon: FileArchive, label: 'Compresser vers…', items: [
    { icon: FileArchive, label: 'Archive ZIP', id: 'compress.zip' },
    { icon: FileArchive, label: 'Archive 7z', id: 'compress.7z' },
    { icon: FileArchive, label: 'Archive TAR.GZ', id: 'compress.targz' },
  ],
};

const copyAs: CtxItem = {
  kind: 'submenu', icon: ClipboardCopy, label: 'Copier comme…', items: [
    { icon: ClipboardCopy, label: 'Chemin d\'accès', id: 'copy.path' },
    { icon: ClipboardCopy, label: 'Nom', id: 'copy.name' },
  ],
};

const newSubmenu: CtxItem = {
  kind: 'submenu', icon: Plus, label: 'Nouveau', items: [
    { icon: FolderPlus, label: 'Dossier', id: 'new.folder' },
    { icon: FileText, label: 'Document texte', id: 'new.txt' },
    { icon: FileText, label: 'Document Word', id: 'new.docx' },
    { icon: FileText, label: 'Feuille Excel', id: 'new.xlsx' },
    { icon: FileText, label: 'Présentation', id: 'new.pptx' },
    { icon: Code, label: 'Fichier source', id: 'new.code' },
  ],
};

const headerStrip = (extra: Array<{ icon: any; label: string; id: string; danger?: boolean }> = []): CtxItem => ({
  kind: 'header-actions',
  items: [
    { icon: Scissors, label: 'Couper', id: 'cut' },
    { icon: Copy, label: 'Copier', id: 'copy' },
    { icon: Pencil, label: 'Renommer', id: 'rename' },
    { icon: Share2, label: 'Partager', id: 'share' },
    ...extra,
    { icon: Trash2, label: 'Supprimer', id: 'delete', danger: true },
  ],
});

export function buildContextMenu(ctx: CtxContext): CtxItem[] {
  // ── Terminal context menu ──
  if (ctx.isTerminal) {
    return [
      { kind: 'item', icon: Copy, label: 'Copier', id: 'term.copy', shortcut: 'Ctrl+Shift+C' },
      { kind: 'item', icon: ClipboardPaste, label: 'Coller', id: 'term.paste', shortcut: 'Ctrl+Shift+V' },
      { kind: 'sep' },
      { kind: 'item', icon: Search, label: 'Rechercher…', id: 'term.find', shortcut: 'Ctrl+F' },
      { kind: 'item', icon: RefreshCw, label: 'Effacer le terminal', id: 'term.clear', shortcut: 'Ctrl+L' },
      { kind: 'sep' },
      { kind: 'item', icon: Plus, label: 'Nouvel onglet de terminal', id: 'term.new' },
      { kind: 'item', icon: Square, label: 'Interrompre (Ctrl+C)', id: 'term.kill', danger: true },
      { kind: 'sep' },
      { kind: 'item', icon: Settings, label: 'Paramètres du terminal', id: 'term.settings' },
      { kind: 'item', icon: X, label: 'Fermer le terminal', id: 'term.close', danger: true },
    ];
  }

  // ── Mobile device root ──
  if (ctx.isMobileDevice) {
    return [
      { kind: 'item', icon: FolderOpen, label: 'Ouvrir', id: 'open' },
      { kind: 'item', icon: ExternalLink, label: 'Ouvrir dans un nouvel onglet', id: 'open.tab' },
      { kind: 'sep' },
      { kind: 'item', icon: RefreshCw, label: 'Synchroniser le contenu', id: 'mobile.sync' },
      { kind: 'item', icon: Battery, label: 'Informations batterie', id: 'mobile.battery' },
      { kind: 'item', icon: Smartphone, label: 'Propriétés de l\'appareil', id: 'mobile.info' },
      { kind: 'sep' },
      { kind: 'item', icon: Power, label: 'Éjecter en toute sécurité', id: 'mobile.eject', danger: true },
    ];
  }

  // ── Mobile folder (DCIM, Pictures, etc.) ──
  if (ctx.isMobileFolder) {
    return [
      { kind: 'item', icon: FolderOpen, label: 'Ouvrir', id: 'open' },
      { kind: 'item', icon: ExternalLink, label: 'Ouvrir dans un nouvel onglet', id: 'open.tab' },
      { kind: 'sep' },
      { kind: 'item', icon: Download, label: 'Importer vers cet ordinateur…', id: 'mobile.import' },
      { kind: 'item', icon: Send, label: 'Envoyer des fichiers vers…', id: 'mobile.export' },
      { kind: 'sep' },
      { kind: 'item', icon: Info, label: 'Propriétés', id: 'properties' },
    ];
  }

  // ── Local server ──
  if (ctx.isServer) {
    const items: CtxItem[] = [
      { kind: 'item', icon: ExternalLink, label: 'Ouvrir le détail', id: 'open' },
    ];
    if (ctx.serverKind === 'http') {
      items.push({ kind: 'item', icon: Globe, label: 'Ouvrir dans le navigateur', id: 'server.browser' });
    }
    items.push({ kind: 'sep' });
    if (ctx.serverRunning) {
      items.push({ kind: 'item', icon: Square, label: 'Arrêter le serveur', id: 'server.stop', danger: true });
      items.push({ kind: 'item', icon: RotateCw, label: 'Redémarrer', id: 'server.restart' });
    } else {
      items.push({ kind: 'item', icon: Play, label: 'Démarrer le serveur', id: 'server.start' });
    }
    items.push({ kind: 'item', icon: TerminalSquare, label: 'Voir les logs', id: 'server.logs' });
    items.push({ kind: 'sep' });
    items.push({ kind: 'item', icon: ClipboardCopy, label: 'Copier l\'URL', id: 'copy.url' });
    items.push({ kind: 'item', icon: Settings, label: 'Configuration…', id: 'server.config' });
    return items;
  }

  // ── GitHub repo card (in panel) ──
  if (ctx.isGithubRepoCard) {
    return [
      { kind: 'item', icon: ExternalLink, label: 'Ouvrir le dépôt', id: 'open' },
      { kind: 'item', icon: Code, label: 'Ouvrir local', id: 'open.local' },
      { kind: 'item', icon: Globe, label: 'Voir sur github.com', id: 'git.web' },
      { kind: 'sep' },
      { kind: 'item', icon: Download, label: 'Cloner le dépôt…', id: 'git.clone' },
      { kind: 'item', icon: GitBranch, label: 'Changer de branche…', id: 'git.branch' },
      { kind: 'item', icon: RefreshCw, label: 'Synchroniser (pull)', id: 'git.pull' },
      { kind: 'item', icon: GitPullRequest, label: 'Créer une Pull Request', id: 'git.pr' },
      { kind: 'item', icon: History, label: 'Historique des commits', id: 'git.history' },
      { kind: 'sep' },
      { kind: 'item', icon: Star, label: 'Star ce dépôt', id: 'git.star' },
      { kind: 'item', icon: ClipboardCopy, label: 'Copier l\'URL HTTPS', id: 'copy.url' },
      { kind: 'item', icon: ClipboardCopy, label: 'Copier l\'URL SSH', id: 'copy.url.ssh' },
      { kind: 'sep' },
      { kind: 'item', icon: Settings, label: 'Paramètres du dépôt', id: 'settings' },
    ];
  }

  // ── GitHub tree item (repo detail sidebar) ──
  if (ctx.isGithubTreeItem) {
    const isDir = ctx.githubItemType === 'dir';
    return [
      { kind: 'item', icon: isDir ? FolderOpen : FileText, label: isDir ? 'Déplier / ouvrir' : 'Ouvrir le fichier', id: 'open' },
      { kind: 'item', icon: Globe, label: 'Voir sur github.com', id: 'git.web' },
      { kind: 'sep' },
      { kind: 'item', icon: ClipboardCopy, label: 'Copier le chemin', id: 'copy.path' },
      { kind: 'item', icon: ClipboardCopy, label: 'Copier le nom', id: 'copy.name' },
      { kind: 'sep' },
      { kind: 'item', icon: History, label: 'Historique du fichier', id: 'git.history' },
      { kind: 'item', icon: Download, label: 'Télécharger', id: 'git.download' },
    ];
  }

  // ── Desktop background (right-click on the desktop) ──
  if (ctx.isDesktop && ctx.isBackground) {
    return [
      {
        kind: 'submenu', icon: Eye, label: 'Affichage', items: [
          { icon: Layers, label: 'Grandes icônes', id: 'view.icons.large' },
          { icon: Layers, label: 'Icônes moyennes', id: 'view.icons.medium' },
          { icon: Layers, label: 'Petites icônes', id: 'view.icons.small' },
        ],
      },
      {
        kind: 'submenu', icon: SortIcon, label: 'Trier par', items: [
          { icon: SortIcon, label: 'Nom', id: 'sort.name' },
          { icon: SortIcon, label: 'Type', id: 'sort.type' },
          { icon: SortIcon, label: 'Date', id: 'sort.date' },
        ],
      },
      { kind: 'item', icon: RefreshCw, label: 'Actualiser', id: 'desktop.refresh', shortcut: 'F5' },
      { kind: 'sep' },
      { kind: 'item', icon: ClipboardPaste, label: 'Coller', id: 'paste', shortcut: 'Ctrl+V', disabled: !ctx.hasClipboard },
      newSubmenu,
      { kind: 'sep' },
      { kind: 'item', icon: TerminalSquare, label: 'Ouvrir le Terminal', id: 'desktop.open-terminal' },
      { kind: 'item', icon: FolderOpen, label: 'Ouvrir l\'Explorateur', id: 'desktop.open-explorer' },
      { kind: 'sep' },
      { kind: 'item', icon: RotateCcw, label: 'Réinitialiser les icônes', id: 'desktop.reset-icons' },
      { kind: 'item', icon: Monitor, label: 'Paramètres d\'affichage', id: 'desktop.display' },
      { kind: 'item', icon: Sparkles, label: 'Personnaliser', id: 'desktop.personalize' },
    ];
  }

  // ── Background (empty area in folder) ──
  if (ctx.isBackground) {
    return [
      { kind: 'item', icon: Eye, label: 'Affichage', id: 'view' },
      { kind: 'item', icon: SortIcon, label: 'Trier par', id: 'sort' },
      { kind: 'item', icon: RefreshCw, label: 'Actualiser', id: 'refresh', shortcut: 'F5' },
      { kind: 'sep' },
      { kind: 'item', icon: ClipboardPaste, label: 'Coller', id: 'paste', shortcut: 'Ctrl+V', disabled: !ctx.hasClipboard },
      { kind: 'item', icon: ClipboardPaste, label: 'Coller le raccourci', id: 'paste.shortcut', disabled: !ctx.hasClipboard },
      { kind: 'sep' },
      newSubmenu,
      { kind: 'sep' },
      { kind: 'item', icon: TerminalSquare, label: 'Ouvrir dans le terminal', id: 'terminal' },
      { kind: 'item', icon: Code, label: 'Ouvrir dans VS Code', id: 'open.vscode.here' },
      { kind: 'sep' },
      { kind: 'item', icon: Info, label: 'Propriétés', id: 'properties', shortcut: 'Alt+Entrée' },
    ];
  }

  // ── Sidebar repo ──
  if (ctx.isRepo) {
    return [
      { kind: 'item', icon: ExternalLink, label: 'Ouvrir le dépôt', id: 'open' },
      { kind: 'item', icon: Code, label: 'Ouvrir local', id: 'open.local' },
      { kind: 'item', icon: Globe, label: 'Voir sur github.com', id: 'git.web' },
      { kind: 'sep' },
      { kind: 'item', icon: GitBranch, label: 'Changer de branche…', id: 'git.branch' },
      { kind: 'item', icon: RefreshCw, label: 'Synchroniser (pull)', id: 'git.pull' },
      { kind: 'item', icon: GitPullRequest, label: 'Créer une Pull Request', id: 'git.pr' },
      { kind: 'item', icon: History, label: 'Historique', id: 'git.history' },
      { kind: 'sep' },
      { kind: 'item', icon: Star, label: 'Star le dépôt', id: 'git.star' },
      { kind: 'item', icon: ClipboardCopy, label: 'Copier l\'URL', id: 'copy.url' },
      { kind: 'sep' },
      { kind: 'item', icon: Settings, label: 'Paramètres', id: 'settings' },
    ];
  }

  // ── Sidebar drive ──
  if (ctx.isDrive) {
    const kind = ctx.driveKind || 'data';
    const items: CtxItem[] = [
      { kind: 'item', icon: FolderOpen, label: 'Ouvrir', id: 'open' },
      { kind: 'item', icon: ExternalLink, label: 'Ouvrir dans un nouvel onglet', id: 'open.tab' },
      { kind: 'item', icon: ExternalLink, label: 'Ouvrir dans une nouvelle fenêtre', id: 'open.window' },
      { kind: 'sep' },
      { kind: 'item', icon: Pin, label: 'Épingler à l\'accès rapide', id: 'pin' },
      { kind: 'item', icon: Pin, label: 'Épingler au menu Démarrer', id: 'pin.start' },
      { kind: 'sep' },
      { kind: 'item', icon: Disc, label: 'Analyser (chkdsk)', id: 'drive.scan' },
      { kind: 'item', icon: HardDrive, label: 'Optimiser et défragmenter', id: 'drive.optimize' },
      { kind: 'item', icon: FileArchive, label: 'Nettoyage de disque', id: 'drive.cleanup' },
    ];
    if (kind === 'system') {
      items.push({ kind: 'item', icon: Lock, label: 'Activer BitLocker…', id: 'drive.bitlocker' });
      items.push({ kind: 'item', icon: Database, label: 'Sauvegarde système', id: 'drive.backup' });
    }
    if (kind === 'removable') {
      items.push({ kind: 'sep' });
      items.push({ kind: 'item', icon: RefreshCw, label: 'Formater le périphérique…', id: 'drive.format', danger: true });
      items.push({ kind: 'item', icon: Power, label: 'Éjecter', id: 'drive.eject', danger: true });
    }
    items.push({ kind: 'sep' });
    items.push({ kind: 'item', icon: TerminalSquare, label: 'Ouvrir dans le terminal', id: 'terminal' });
    items.push({ kind: 'item', icon: Search, label: 'Indexer ce lecteur…', id: 'drive.index' });
    items.push({ kind: 'sep' });
    items.push({ kind: 'item', icon: Info, label: 'Propriétés', id: 'properties', shortcut: 'Alt+Entrée' });
    return items;
  }

  // ── Sidebar network location ──
  if (ctx.isNetwork) {
    const kind = ctx.networkKind || 'cloud';
    const common: CtxItem[] = [
      { kind: 'item', icon: FolderOpen, label: 'Ouvrir', id: 'open' },
      { kind: 'item', icon: ExternalLink, label: 'Ouvrir dans un nouvel onglet', id: 'open.tab' },
      { kind: 'sep' },
      { kind: 'item', icon: RefreshCw, label: 'Actualiser', id: 'refresh' },
      { kind: 'item', icon: WifiOff, label: 'Déconnecter', id: 'net.disconnect' },
    ];
    const specific: CtxItem[] = [];
    if (kind === 'gdrive') {
      specific.push({ kind: 'item', icon: Globe, label: 'Ouvrir dans Google Drive', id: 'gdrive.web' });
      specific.push({ kind: 'item', icon: Share2, label: 'Partager via Google Drive', id: 'gdrive.share' });
      specific.push({ kind: 'item', icon: Bookmark, label: 'Voir les fichiers partagés', id: 'gdrive.shared' });
    } else if (kind === 'onedrive') {
      specific.push({ kind: 'item', icon: Globe, label: 'Ouvrir OneDrive sur le web', id: 'onedrive.web' });
      specific.push({ kind: 'item', icon: Layers, label: 'Choisir les dossiers à synchroniser', id: 'onedrive.choose' });
      specific.push({ kind: 'item', icon: Pause, label: 'Suspendre la synchro (2h)', id: 'onedrive.pause' });
    } else if (kind === 'smb') {
      specific.push({ kind: 'item', icon: Server, label: 'Voir les autres partages SMB', id: 'smb.browse' });
      specific.push({ kind: 'item', icon: Lock, label: 'Modifier les identifiants', id: 'smb.credentials' });
    } else if (kind === 'ftp') {
      specific.push({ kind: 'item', icon: Server, label: 'Tester la connexion', id: 'ftp.test' });
      specific.push({ kind: 'item', icon: Lock, label: 'Modifier les identifiants', id: 'ftp.credentials' });
      specific.push({ kind: 'item', icon: Settings, label: 'Mode passif/actif…', id: 'ftp.mode' });
    }
    return [
      ...common,
      ...(specific.length ? [{ kind: 'sep' as const }, ...specific] : []),
      { kind: 'sep' },
      { kind: 'item', icon: ClipboardCopy, label: 'Copier le chemin réseau', id: 'copy.path' },
      { kind: 'item', icon: Trash2, label: 'Retirer cet emplacement', id: 'delete', danger: true },
      { kind: 'sep' },
      { kind: 'item', icon: Info, label: 'Propriétés', id: 'properties' },
    ];
  }

  // ── Sidebar quick-access folder ──
  if (ctx.isQuickAccess) {
    return [
      { kind: 'item', icon: FolderOpen, label: 'Ouvrir', id: 'open' },
      { kind: 'item', icon: ExternalLink, label: 'Ouvrir dans un nouvel onglet', id: 'open.tab' },
      { kind: 'item', icon: ExternalLink, label: 'Ouvrir dans une nouvelle fenêtre', id: 'open.window' },
      { kind: 'sep' },
      { kind: 'item', icon: PinOff, label: 'Détacher de l\'accès rapide', id: 'unpin' },
      { kind: 'sep' },
      copyAs,
      { kind: 'sep' },
      { kind: 'item', icon: TerminalSquare, label: 'Ouvrir dans le terminal', id: 'terminal' },
      { kind: 'sep' },
      { kind: 'item', icon: Info, label: 'Propriétés', id: 'properties' },
    ];
  }

  // ── File item ──
  const file = ctx.file;
  if (!file) return [];
  const ext = file.extension?.toLowerCase();
  const type = file.type;
  const isFolder = type === 'folder';

  // Folder
  if (isFolder) {
    return [
      headerStrip(),
      { kind: 'item', icon: FolderOpen, label: 'Ouvrir', id: 'open', shortcut: 'Entrée' },
      { kind: 'item', icon: ExternalLink, label: 'Ouvrir dans un nouvel onglet', id: 'open.tab' },
      { kind: 'item', icon: Columns2, label: 'Ouvrir à droite (nouvel onglet)', id: 'open.right' },
      { kind: 'item', icon: ExternalLink, label: 'Ouvrir dans une nouvelle fenêtre', id: 'open.window' },
      { kind: 'sep' },
      { kind: 'item', icon: Pin, label: 'Épingler à l\'accès rapide', id: 'pin' },
      compressTo,
      copyAs,
      { kind: 'sep' },
      { kind: 'item', icon: ClipboardPaste, label: 'Coller dans ce dossier', id: 'paste', disabled: !ctx.hasClipboard, shortcut: 'Ctrl+V' },
      sendTo(),
      { kind: 'sep' },
      { kind: 'item', icon: TerminalSquare, label: 'Ouvrir dans le terminal', id: 'terminal' },
      { kind: 'item', icon: Code, label: 'Ouvrir dans VS Code', id: 'open.vscode' },
      { kind: 'sep' },
      { kind: 'item', icon: Info, label: 'Propriétés', id: 'properties', shortcut: 'Alt+Entrée' },
    ];
  }

  // Image
  if (type === 'image') {
    return [
      headerStrip(),
      { kind: 'item', icon: Eye, label: 'Aperçu', id: 'preview', shortcut: 'Espace' },
      openWith(
        { icon: ImageIcon, label: 'Photos (par défaut)', id: 'open.photos' },
        { icon: Edit3, label: 'Paint', id: 'open.paint' },
        { icon: Palette, label: 'Photoshop', id: 'open.photoshop' },
        { icon: Globe, label: 'Navigateur Web', id: 'open.browser' },
      ),
      { kind: 'sep' },
      { kind: 'item', icon: Crop, label: 'Modifier avec Photos', id: 'image.edit' },
      { kind: 'item', icon: Wand2, label: 'Définir comme fond d\'écran', id: 'image.wallpaper' },
      { kind: 'item', icon: RefreshCw, label: 'Faire pivoter à droite', id: 'image.rotate-r' },
      { kind: 'item', icon: RefreshCw, label: 'Faire pivoter à gauche', id: 'image.rotate-l' },
      { kind: 'sep' },
      compressTo,
      copyAs,
      sendTo(),
      { kind: 'sep' },
      { kind: 'item', icon: Info, label: 'Propriétés', id: 'properties', shortcut: 'Alt+Entrée' },
    ];
  }

  // Video
  if (type === 'video') {
    return [
      headerStrip(),
      { kind: 'item', icon: Play, label: 'Lire', id: 'open' },
      { kind: 'item', icon: Eye, label: 'Aperçu', id: 'preview', shortcut: 'Espace' },
      openWith(
        { icon: Film, label: 'Films et TV', id: 'open.movies' },
        { icon: Play, label: 'VLC media player', id: 'open.vlc' },
        { icon: Globe, label: 'Navigateur Web', id: 'open.browser' },
      ),
      { kind: 'sep' },
      { kind: 'item', icon: Film, label: 'Convertir…', id: 'video.convert' },
      { kind: 'item', icon: Crop, label: 'Découper la vidéo', id: 'video.trim' },
      { kind: 'item', icon: ImageIcon, label: 'Extraire une image', id: 'video.frame' },
      { kind: 'sep' },
      compressTo, copyAs, sendTo(),
      { kind: 'sep' },
      { kind: 'item', icon: Info, label: 'Propriétés', id: 'properties', shortcut: 'Alt+Entrée' },
    ];
  }

  // Audio
  if (type === 'audio') {
    return [
      headerStrip(),
      { kind: 'item', icon: Play, label: 'Lire', id: 'open' },
      { kind: 'item', icon: Eye, label: 'Aperçu', id: 'preview', shortcut: 'Espace' },
      openWith(
        { icon: Music, label: 'Lecteur Windows Media', id: 'open.wmp' },
        { icon: Music, label: 'Groove Music', id: 'open.groove' },
        { icon: Play, label: 'VLC media player', id: 'open.vlc' },
      ),
      { kind: 'sep' },
      { kind: 'item', icon: Music, label: 'Ajouter à la playlist', id: 'audio.playlist' },
      { kind: 'item', icon: Music, label: 'Convertir le format', id: 'audio.convert' },
      { kind: 'sep' },
      compressTo, copyAs, sendTo(),
      { kind: 'sep' },
      { kind: 'item', icon: Info, label: 'Propriétés', id: 'properties', shortcut: 'Alt+Entrée' },
    ];
  }

  // Executable
  if (type === 'executable') {
    return [
      headerStrip(),
      { kind: 'item', icon: Play, label: 'Exécuter', id: 'open' },
      { kind: 'item', icon: Lock, label: 'Exécuter en tant qu\'administrateur', id: 'exe.admin' },
      { kind: 'sep' },
      { kind: 'item', icon: Pin, label: 'Épingler au menu Démarrer', id: 'pin.start' },
      { kind: 'item', icon: Pin, label: 'Épingler à la barre des tâches', id: 'pin.taskbar' },
      { kind: 'item', icon: ExternalLink, label: 'Créer un raccourci', id: 'shortcut' },
      { kind: 'sep' },
      { kind: 'item', icon: Settings, label: 'Mode de compatibilité…', id: 'exe.compat' },
      { kind: 'item', icon: Unlock, label: 'Débloquer le fichier', id: 'exe.unblock' },
      { kind: 'sep' },
      compressTo, copyAs, sendTo(),
      { kind: 'sep' },
      { kind: 'item', icon: Info, label: 'Propriétés', id: 'properties', shortcut: 'Alt+Entrée' },
    ];
  }

  // Archive
  if (type === 'archive') {
    return [
      headerStrip(),
      { kind: 'item', icon: FolderOpen, label: 'Ouvrir', id: 'open' },
      { kind: 'item', icon: FolderInput, label: 'Extraire ici', id: 'archive.extract.here' },
      { kind: 'item', icon: FolderInput, label: 'Extraire vers…', id: 'archive.extract.to' },
      { kind: 'item', icon: FolderInput, label: `Extraire vers "${file.name.replace(/\.[^.]+$/, '')}"`, id: 'archive.extract.named' },
      { kind: 'sep' },
      openWith(
        { icon: FileArchive, label: '7-Zip', id: 'open.7zip' },
        { icon: FileArchive, label: 'WinRAR', id: 'open.winrar' },
      ),
      { kind: 'sep' },
      copyAs, sendTo(),
      { kind: 'sep' },
      { kind: 'item', icon: Info, label: 'Propriétés', id: 'properties' },
    ];
  }

  // Code / text / markdown
  if (type === 'code' || type === 'text') {
    return [
      headerStrip(),
      { kind: 'item', icon: Code, label: 'Modifier avec VS Code', id: 'open.vscode' },
      { kind: 'item', icon: FileText, label: 'Modifier avec Bloc-notes', id: 'open.notepad' },
      { kind: 'item', icon: Eye, label: 'Aperçu', id: 'preview', shortcut: 'Espace' },
      openWith(
        { icon: Code, label: 'Visual Studio Code', id: 'open.vscode' },
        { icon: FileText, label: 'Bloc-notes', id: 'open.notepad' },
        { icon: Globe, label: 'Navigateur Web', id: 'open.browser' },
        { icon: Code, label: 'Sublime Text', id: 'open.sublime' },
      ),
      { kind: 'sep' },
      { kind: 'item', icon: TerminalSquare, label: 'Exécuter dans le terminal', id: 'code.run' },
      { kind: 'sep' },
      compressTo, copyAs, sendTo(),
      { kind: 'sep' },
      { kind: 'item', icon: Info, label: 'Propriétés', id: 'properties', shortcut: 'Alt+Entrée' },
    ];
  }

  // PDF
  if (type === 'pdf') {
    return [
      headerStrip(),
      { kind: 'item', icon: FolderOpen, label: 'Ouvrir', id: 'open' },
      openWith(
        { icon: FileText, label: 'Adobe Acrobat', id: 'open.acrobat' },
        { icon: Globe, label: 'Microsoft Edge', id: 'open.edge' },
        { icon: Globe, label: 'Chrome', id: 'open.chrome' },
      ),
      { kind: 'item', icon: Eye, label: 'Aperçu', id: 'preview' },
      { kind: 'sep' },
      { kind: 'item', icon: Edit3, label: 'Modifier avec Acrobat', id: 'pdf.edit' },
      { kind: 'item', icon: FileText, label: 'Convertir en Word', id: 'pdf.toword' },
      { kind: 'item', icon: ImageIcon, label: 'Convertir en image', id: 'pdf.toimg' },
      { kind: 'sep' },
      compressTo, copyAs, sendTo(),
      { kind: 'sep' },
      { kind: 'item', icon: Info, label: 'Propriétés', id: 'properties' },
    ];
  }

  // Document / spreadsheet / presentation
  if (type === 'document' || type === 'spreadsheet' || type === 'presentation') {
    const officeApp = type === 'spreadsheet' ? 'Excel' : type === 'presentation' ? 'PowerPoint' : 'Word';
    return [
      headerStrip(),
      { kind: 'item', icon: FolderOpen, label: 'Ouvrir', id: 'open' },
      openWith(
        { icon: FileText, label: `Microsoft ${officeApp}`, id: 'open.office' },
        { icon: FileText, label: `${officeApp} Online`, id: 'open.office365' },
        { icon: FileText, label: 'LibreOffice', id: 'open.libre' },
      ),
      { kind: 'item', icon: Eye, label: 'Aperçu', id: 'preview' },
      { kind: 'sep' },
      { kind: 'item', icon: Lock, label: 'Marquer comme final', id: 'doc.final' },
      { kind: 'item', icon: Share2, label: 'Partager via Outlook', id: 'doc.outlook' },
      { kind: 'sep' },
      compressTo, copyAs, sendTo(),
      { kind: 'sep' },
      { kind: 'item', icon: Info, label: 'Propriétés', id: 'properties' },
    ];
  }

  // Default fallback
  return [
    headerStrip(),
    { kind: 'item', icon: FolderOpen, label: 'Ouvrir', id: 'open' },
    openWith(
      { icon: Code, label: 'Visual Studio Code', id: 'open.vscode' },
      { icon: FileText, label: 'Bloc-notes', id: 'open.notepad' },
      { icon: Globe, label: 'Navigateur Web', id: 'open.browser' },
    ),
    { kind: 'item', icon: Eye, label: 'Aperçu', id: 'preview' },
    { kind: 'sep' },
    compressTo, copyAs, sendTo(),
    { kind: 'sep' },
    { kind: 'item', icon: Info, label: 'Propriétés', id: 'properties', shortcut: 'Alt+Entrée' },
  ];
}

// Local helper because Lucide doesn't have a generic "sort" icon name
function SortIcon(props: any) {
  return (
    <svg width={props.size || 14} height={props.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M3 6h18M6 12h12M9 18h6" />
    </svg>
  );
}

