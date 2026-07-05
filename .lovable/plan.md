## Plan — Améliorations Explorer (batch complet, tout de suite)

### 1. Terminal — splitter + onglet
- Envelopper la zone `[contenu explorer | TerminalPanel]` dans un `ResizablePanelGroup direction="vertical"` (dans `ExplorerTab.tsx`).
  - Terminal : `defaultSize=30`, `minSize=10`, `maxSize=70`, hauteur persistée (localStorage `explorer.terminalHeight`).
  - Handle horizontal visible entre les deux.
- Ajouter bouton "Ouvrir dans un onglet" dans le header du `TerminalPanel` → crée un nouvel onglet spécial (type `terminal`) dans `TabBar` qui affiche `TerminalPanel` en plein écran (sans arborescence de fichiers). Nouveau champ `tab.kind: 'explorer' | 'terminal'`.

### 2. Cache pour dépôts GitHub
- Créer `src/lib/githubCache.ts` : cache en mémoire + localStorage (TTL 5 min) avec clés `repo:{owner/name}`, `tree:{sha}`, `commits:{owner/name}`, `file:{sha}:{path}`.
- Dans `GitHubPanel`, avant chaque `fetch` GitHub : lire le cache ; si présent, afficher instantanément puis revalider en arrière-plan (SWR pattern). Invalidation manuelle via le bouton "actualiser".

### 3. Page détail dépôt — refonte
- **Arbre style VS Code** à la place de la liste plate : nouveau composant `GitHubFileTree` (récursif, chevrons, indentation 12px, icônes de fichiers/dossiers via `FileIcon`/`iconRegistry`, dossiers d'abord, tri alpha, chargement lazy des sous-dossiers via `git/trees`).
- **Suppression du panneau commits** : garder uniquement la version `<select>` compacte dans la barre de titre de l'éditeur (comportement déjà prévu comme fallback → devient le comportement par défaut). Monaco occupe toute la largeur restante.
- **Empty state Monaco** : quand aucun fichier sélectionné, afficher un `EmptyState` (icône GitHub + "Sélectionnez un fichier dans l'arbre") au lieu de Monaco.
- **Réorganisation header** :
  - À gauche, juste après l'icône terminal de la Toolbar : `[← retour] [avatar] [nom du dépôt] [badge SHA]`.
  - À droite : seul le bouton "actualiser" reste.
  - Injection via la prop `githubHeader` déjà prévue, mais scindée en `githubHeaderLeft` / `githubHeaderRight`.

### 4. GitHubAuthDialog — refonte de l'en-tête
- Supprimer le texte descriptif actuel en haut.
- Nouveau header épuré : icône GitHub + titre court "Connecter un compte GitHub" + petit lien "Créer un token" (discret, aligné à droite).
- Garder le corps (`GitHubAuthCard`) tel quel.

### 5. Page Réseaux — activation des réseaux locaux + nouvelles sources cloud
- **Réseaux locaux** : afficher la section "Serveurs locaux" (données `src/data/localServers.ts` déjà présentes) dans le panneau Réseau ; clic → `LocalServerDetail` (déjà existant) qui explore les routes.
- **Nouvelles sources cloud** (front-end uniquement, cartes dans `NewConnectionDialog` + entrées sidebar) :
  - Google Drive, OneDrive, Dropbox, Box, iCloud Drive, Amazon S3, WebDAV, SFTP.
  - Chaque source : icône, formulaire de connexion mocké (champs adaptés), stockage localStorage. Aucun back-end pour l'instant — juste UI + persistance.

### 6. Ouvrir un dossier à droite (split via clic droit)
- Ajouter entrée "Ouvrir à droite" dans le menu contextuel des dossiers (`contextMenuConfig.tsx`).
- Action → active `SplitView` avec le dossier courant à gauche et le dossier cible à droite (utilise `SplitView` existant, initialise `rightFolderId`).

### Ordre d'exécution
1. Cache GitHub (gain UX immédiat)
2. Refonte page détail dépôt (arbre + empty state + select commits + repositionnement header)
3. Splitter terminal + onglet terminal
4. GitHubAuthDialog refonte header
5. Réseaux locaux + nouvelles sources cloud
6. "Ouvrir à droite" via clic droit

### Notes techniques
- Cache SWR : simple wrapper `getCached(key, fetcher, ttl)` renvoyant `{data, revalidate}`.
- Arbre GitHub : appel initial `git/trees/{sha}` non récursif ; chargement lazy des sous-arbres au dépliage. Icônes réutilisent `iconResolver`.
- Onglet terminal : ajout d'un discriminant `kind` dans le type `Tab`, rendu conditionnel dans le parent.
- "Ouvrir à droite" émet un event `explorer:open-right` avec `folderId` intercepté par le conteneur qui bascule en split.
- Sources cloud sans back : formulaires validés côté client, entrées persistées, navigation affiche un `EmptyState` "connexion mock — back-end à venir".