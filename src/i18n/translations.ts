export type Locale = 'fr' | 'en';
export type { Locale as LocaleType };

const translations: Record<string, Record<Locale, string>> = {
  // Sidebar
  'sidebar.quickAccess': { fr: 'Accès rapide', en: 'Quick Access' },
  'sidebar.thisPC': { fr: 'Ce PC', en: 'This PC' },
  'sidebar.network': { fr: 'Réseau', en: 'Network' },
  'sidebar.devices': { fr: 'Appareils', en: 'Devices' },
  'sidebar.trash': { fr: 'Corbeille', en: 'Recycle Bin' },
  'sidebar.github': { fr: 'GitHub', en: 'GitHub' },
  'toolbar.searchInFolder': { fr: 'Rechercher dans ce dossier…', en: 'Search this folder…' },
  'status.mute': { fr: 'Couper le son', en: 'Mute sounds' },
  'status.unmute': { fr: 'Activer le son', en: 'Enable sounds' },
  'github.title': { fr: 'Dépôts GitHub', en: 'GitHub Repositories' },
  'github.subtitle': { fr: 'Vos dépôts clonés et synchronisés', en: 'Your cloned & synced repos' },
  'github.repos': { fr: 'Tous les dépôts', en: 'All repositories' },

  // Toolbar
  'toolbar.new': { fr: 'Nouveau', en: 'New' },
  'toolbar.cut': { fr: 'Couper', en: 'Cut' },
  'toolbar.copy': { fr: 'Copier', en: 'Copy' },
  'toolbar.paste': { fr: 'Coller', en: 'Paste' },
  'toolbar.rename': { fr: 'Renommer', en: 'Rename' },
  'toolbar.delete': { fr: 'Supprimer', en: 'Delete' },
  'toolbar.sort': { fr: 'Trier', en: 'Sort' },
  'toolbar.view': { fr: 'Affichage', en: 'View' },
  'toolbar.search': { fr: 'Rechercher', en: 'Search' },
  'toolbar.refresh': { fr: 'Actualiser', en: 'Refresh' },
  'toolbar.back': { fr: 'Précédent', en: 'Back' },
  'toolbar.forward': { fr: 'Suivant', en: 'Forward' },
  'toolbar.up': { fr: 'Dossier parent', en: 'Parent folder' },
  'toolbar.sortBy': { fr: 'Trier par', en: 'Sort by' },
  'toolbar.previewPane': { fr: 'Volet de prévisualisation', en: 'Preview pane' },
  'toolbar.split': { fr: 'Diviser', en: 'Split view' },
  'toolbar.showHidden': { fr: 'Afficher fichiers cachés', en: 'Show hidden files' },
  'toolbar.showExtensions': { fr: 'Afficher les extensions', en: 'Show file extensions' },
  'toolbar.commandPalette': { fr: 'Palette de commandes', en: 'Command palette' },

  // Sort
  'sort.name': { fr: 'Nom', en: 'Name' },
  'sort.dateModified': { fr: 'Date de modification', en: 'Date modified' },
  'sort.size': { fr: 'Taille', en: 'Size' },
  'sort.type': { fr: 'Type', en: 'Type' },

  // View modes
  'view.gridLarge': { fr: 'Très grandes icônes', en: 'Extra large icons' },
  'view.gridMedium': { fr: 'Icônes moyennes', en: 'Medium icons' },
  'view.gridSmall': { fr: 'Petites icônes', en: 'Small icons' },
  'view.list': { fr: 'Liste', en: 'List' },
  'view.details': { fr: 'Détails', en: 'Details' },
  'view.tiles': { fr: 'Mosaïque', en: 'Tiles' },
  'view.content': { fr: 'Contenu', en: 'Content' },

  // Status bar
  'status.items': { fr: 'élément', en: 'item' },
  'status.items_plural': { fr: 'éléments', en: 'items' },
  'status.selected': { fr: 'sélectionné', en: 'selected' },
  'status.selected_plural': { fr: 'sélectionnés', en: 'selected' },
  'status.folders': { fr: 'dossiers', en: 'folders' },
  'status.files': { fr: 'fichiers', en: 'files' },

  // Context menu
  'ctx.open': { fr: 'Ouvrir', en: 'Open' },
  'ctx.preview': { fr: 'Aperçu', en: 'Preview' },
  'ctx.newFolder': { fr: 'Nouveau dossier', en: 'New folder' },
  'ctx.properties': { fr: 'Propriétés', en: 'Properties' },
  'ctx.openWith': { fr: 'Ouvrir avec', en: 'Open with' },
  'ctx.sendTo': { fr: 'Envoyer vers', en: 'Send to' },
  'ctx.copyAs': { fr: 'Copier comme', en: 'Copy as' },
  'ctx.copyPath': { fr: 'Copier le chemin', en: 'Copy path' },
  'ctx.copyName': { fr: 'Copier le nom', en: 'Copy name' },
  'ctx.openTerminal': { fr: 'Ouvrir dans le terminal', en: 'Open in terminal' },
  'ctx.openWithVSCode': { fr: 'Code – Visual Studio Code', en: 'Code – Visual Studio Code' },
  'ctx.openWithNotepad': { fr: 'Bloc-notes', en: 'Notepad' },
  'ctx.openWithBrowser': { fr: 'Navigateur Web', en: 'Web Browser' },
  'ctx.sendDesktop': { fr: 'Bureau (raccourci)', en: 'Desktop (shortcut)' },
  'ctx.sendCompressed': { fr: 'Dossier compressé', en: 'Compressed folder' },
  'ctx.sendMail': { fr: 'Destinataire de courrier', en: 'Mail recipient' },

  // Preview panel
  'preview.title': { fr: 'Aperçu', en: 'Preview' },
  'preview.selectItem': { fr: 'Sélectionnez un élément', en: 'Select an item' },
  'preview.type': { fr: 'Type', en: 'Type' },
  'preview.extension': { fr: 'Extension', en: 'Extension' },
  'preview.size': { fr: 'Taille', en: 'Size' },
  'preview.contents': { fr: 'Contenu', en: 'Contents' },
  'preview.modified': { fr: 'Modifié', en: 'Modified' },
  'preview.created': { fr: 'Créé', en: 'Created' },
  'preview.location': { fr: 'Emplacement', en: 'Location' },
  'preview.tags': { fr: 'Tags', en: 'Tags' },

  // Drive overview
  'drives.frequentFolders': { fr: 'Dossiers fréquents', en: 'Frequent folders' },
  'drives.devicesAndDrives': { fr: 'Périphériques et lecteurs', en: 'Devices and drives' },
  'drives.networkLocations': { fr: 'Emplacements réseau', en: 'Network locations' },
  'drives.freeOf': { fr: 'Go libres sur', en: 'GB free of' },
  'drives.recycleBin': { fr: 'Corbeille', en: 'Recycle Bin' },

  // Empty
  'empty.folder': { fr: 'Ce dossier est vide', en: 'This folder is empty' },

  // File types
  'filetype.folder': { fr: 'Dossier', en: 'Folder' },
  'filetype.image': { fr: 'Image', en: 'Image' },
  'filetype.document': { fr: 'Document', en: 'Document' },
  'filetype.video': { fr: 'Vidéo', en: 'Video' },
  'filetype.audio': { fr: 'Audio', en: 'Audio' },
  'filetype.code': { fr: 'Code source', en: 'Source code' },
  'filetype.archive': { fr: 'Archive', en: 'Archive' },
  'filetype.executable': { fr: 'Exécutable', en: 'Executable' },
  'filetype.text': { fr: 'Fichier texte', en: 'Text file' },
  'filetype.pdf': { fr: 'Document PDF', en: 'PDF Document' },
  'filetype.spreadsheet': { fr: 'Feuille de calcul', en: 'Spreadsheet' },
  'filetype.presentation': { fr: 'Présentation', en: 'Presentation' },
  'filetype.font': { fr: 'Police', en: 'Font' },
  'filetype.database': { fr: 'Base de données', en: 'Database' },
  'filetype.unknown': { fr: 'Fichier', en: 'File' },

  // Toasts
  'toast.copied': { fr: 'Copié dans le presse-papiers', en: 'Copied to clipboard' },
  'toast.cut': { fr: 'Coupé — collez ailleurs pour déplacer', en: 'Cut — paste elsewhere to move' },
  'toast.pasted': { fr: 'Élément(s) collé(s)', en: 'Item(s) pasted' },
  'toast.deleted': { fr: 'Déplacé vers la corbeille', en: 'Moved to recycle bin' },
  'toast.pathCopied': { fr: 'Chemin copié', en: 'Path copied' },
  'toast.terminalOpened': { fr: 'Terminal ouvert ici', en: 'Terminal opened here' },
  'toast.undo': { fr: 'Annuler', en: 'Undo' },

  // Properties dialog
  'props.title': { fr: 'Propriétés', en: 'Properties' },
  'props.general': { fr: 'Général', en: 'General' },
  'props.details': { fr: 'Détails', en: 'Details' },
  'props.security': { fr: 'Sécurité', en: 'Security' },
  'props.versions': { fr: 'Versions précédentes', en: 'Previous versions' },
  'props.name': { fr: 'Nom', en: 'Name' },
  'props.bytes': { fr: 'octets', en: 'bytes' },
  'props.accessed': { fr: 'Dernier accès', en: 'Last accessed' },
  'props.attribute': { fr: 'Attributs', en: 'Attributes' },
  'props.hidden': { fr: 'Masqué', en: 'Hidden' },
  'props.normal': { fr: 'Normal', en: 'Normal' },
  'props.readOnly': { fr: 'Lecture seule', en: 'Read only' },
  'props.yes': { fr: 'Oui', en: 'Yes' },
  'props.no': { fr: 'Non', en: 'No' },
  'props.owner': { fr: 'Propriétaire', en: 'Owner' },
  'props.securityNote': { fr: 'Permissions sur cet élément :', en: 'Permissions on this item:' },
  'props.fullControl': { fr: 'Contrôle total', en: 'Full control' },
  'props.readExecute': { fr: 'Lecture & exécution', en: 'Read & execute' },
  'props.noVersions': { fr: 'Aucune version précédente disponible.', en: 'No previous versions available.' },

  // Mobile device
  'mobile.connected': { fr: 'Connecté', en: 'Connected' },
  'mobile.safeEject': { fr: 'Éjecter en sécurité', en: 'Safely eject' },
  'mobile.storage': { fr: 'Stockage utilisé', en: 'Storage used' },
  'mobile.internal': { fr: 'Mémoire interne', en: 'Internal storage' },
  'mobile.sdcard': { fr: 'Carte SD', en: 'SD card' },

  // Command palette
  'cmd.placeholder': { fr: 'Tapez une commande ou recherchez un dossier…', en: 'Type a command or search a folder…' },
  'cmd.noResult': { fr: 'Aucun résultat', en: 'No result' },
  'cmd.actions': { fr: 'Actions', en: 'Actions' },
  'cmd.folders': { fr: 'Dossiers', en: 'Folders' },
  'cmd.toggleHidden': { fr: 'Basculer fichiers cachés', en: 'Toggle hidden files' },
  'cmd.toggleLang': { fr: 'Changer de langue', en: 'Switch language' },

  // Language
  'lang.label': { fr: 'FR', en: 'EN' },

  // Terminal & misc
  'terminal.title': { fr: 'Terminal', en: 'Terminal' },
  'terminal.open': { fr: 'Ouvrir le terminal', en: 'Open terminal' },
  'notifications.title': { fr: 'Notifications', en: 'Notifications' },
  'notifications.empty': { fr: 'Aucune notification', en: 'No notifications' },
  'split.toggle': { fr: 'Vue divisée', en: 'Split view' },
};

export default translations;
