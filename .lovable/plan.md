# Phase — Terminal Agent IA, Réseau, Explorateur, Prévisualisation

Découpé en 5 lots livrables séquentiellement. Chaque lot est validable indépendamment.

---

## Lot 1 — Terminal AI Agent (priorité absolue)

### 1.1 Correction `ia --auto`
- Diagnostiquer via console + logs edge function `terminal-suggest` (mode `agent`).
- Causes probables : boucle qui n'attend pas la sortie complète avant l'itération suivante, `lastOutput` vide, ou action `abort` par défaut si JSON malformé.
- Refonte : promise chain claire `exec → wait exit → capture stdout/stderr/code → agent decide → next`.
- Gestion d'erreur affichée en ligne rouge : `⚠ agent: <raison>` avec bouton "Réessayer" / "Abandonner".

### 1.2 Vrai AI Agent Terminal
Nouveau moteur `terminal/agent/AgentRunner.ts` :
```
plan → detect(project) → command → run → observe → judge → (fix|next|done)
```
- `detect(cwd)` : lit `package.json`, `Cargo.toml`, `pyproject.toml`, `Makefile`, `go.mod`, `*.csproj` via `/api/fs/read`.
- Étape "plan" affichée avant exécution (liste numérotée pliable).
- `ia build`, `ia test`, `ia run`, `ia fix`, `ia install` = raccourcis qui préchargent l'objectif.
- Cap 12 itérations, budget de correction 3 par erreur identique, sinon `abort` propre.

### 1.3 Mode Chat intégré
- Bouton `💬 Chat` dans `TerminalHeader`.
- Au clic : `ResizablePanelGroup` horizontal — pane gauche `AgentChatPane` (nouveau), pane droite = terminal existant.
- Chat = uniquement objectifs / réponses IA. Toute exécution reste dans le pane terminal (partage l'`AgentRunner`).
- Bouton bascule pour cacher/remontrer le chat.

### 1.4 Commandes `AI` / `IA` inline
- Parser dans `TerminalView.handleSubmit` : si premier token `∈ {ai, AI, ia, IA}` sans flag `--auto`, route vers `terminal-suggest` mode `chat` (nouveau) et affiche la réponse formatée comme sortie de commande (préfixe `🤖`).

### 1.5 Workflow visuel des étapes
- Nouveau composant `AgentSteps.tsx` : timeline verticale, chaque étape avec icône (Lucide), état (`pending|running|ok|error`), spinner braille sur l'étape active, fade-in 150 ms.
- Étapes : Compréhension → Détection projet → Plan → Exécution → Analyse → Correction (si besoin) → Succès.

### 1.6 Confirmation commandes critiques
- Regex list dans `agent/dangerous.ts` : `rm -rf`, `format`, `mkfs`, `dd if=`, `shutdown`, `> /dev/sd`, `DROP TABLE`, déplacements > 100 fichiers.
- Avant exécution : `ConfirmDangerousDialog` avec la commande en clair + raison + bouton "Confirmer" / "Annuler". L'agent attend le clic.

---

## Lot 2 — Splits du terminal corrects

- Refactor `TerminalPanel` : abandonner le tableau plat `panes[]` au profit d'un arbre binaire `PaneNode = { id, dir, children[], leaf? }`.
- `Split V/H` opère toujours sur `activePane` en remplaçant le nœud feuille par un nœud `Resizable` à 2 enfants.
- Fermeture d'un pane collapse le nœud parent. Comportement identique VS Code / Cursor.

---

## Lot 3 — Tooltips avancés

- Nouveau composant `RichTooltip` (existe déjà — à enrichir) : slots `icon`, `title`, `description`, `shortcut`, `status`, `meta[]`, `preview` (React node).
- Animation `scale-in` + `fade-in` 120 ms, arrow custom, delay 500 ms, ferme à 100 ms.
- Rebranchement : Toolbar, Sidebar (drives, connexions), TerminalHeader (chaque bouton), StatusBar.

---

## Lot 4 — Réseau : unification icônes + cache

### Icônes
- Étendre `providerLocationKey(provider, type, name?)` : regex sur `name` — `/google.*drive/i → googleDrive`, `/onedrive/i`, `/dropbox/i`, `/icloud/i`, `/box/i`, `/(aws|s3|minio)/i → s3`, `/(nas|synology|qnap)/i → nas`, `/github/i → host` (avec sous-cas), `/(sftp|ftps|ftp)/i`, `/smb|cifs/i`.
- Audit : `RealExplorerSidebar`, `NewConnectionDialog`, `LocalServerDetail`, `DriveOverview`, `RealDriveOverview`, `CloudSourceBrowser` — remplacer chaque `<img>` / icône générique par `<LocationIcon locationKey={providerLocationKey(...)} />`.

### Cache serveurs locaux
- `localServersCache.ts` : TTL 30 s dans `sessionStorage`, invalidation manuelle via bouton refresh header.

---

## Lot 5 — Explorateur PC + GitHub + APSU + Prévisualisation + Création

### 5.1 Arborescence PC style VS Code
- `RealExplorerSidebar` : chaque disque = `TreeNode` pliable, chargement `lazy` au premier expand, état persisté `localStorage: sidebar.tree.expanded.v1`.
- Chevron rotation 90°, indentation 12 px par niveau, spinner braille pendant lazy-load.
- Même mécanisme réutilisé pour les dépôts GitHub (`GitHubFileTree` déjà arborescent → étendre à la sidebar).

### 5.2 APSU splitter
- Wrapper `PreviewPanel` dans `ResizablePanel` avec `minSize=15`, `maxSize=60`, largeur persistée.

### 5.3 Prévisualisation intelligente
- `PreviewTooltip.tsx` (nouveau) : déclenché après 500 ms de survol dans `FileGrid`.
- Router par extension :
  - image → `<img>` chargement progressif + zoom 1.02 au hover
  - vidéo → poster + `<video muted autoplay loop preload="metadata">` mini
  - audio → waveform simple + play button
  - html → `<iframe sandbox srcDoc={content}>` (rendu direct)
  - code (`js, ts, tsx, py, rs, go, json, md, yml, css, html-source`) → Monaco readonly, hauteur auto
  - pdf → `<embed>` première page
  - autres → icône + métadonnées
- `PreviewPanel` (APSU) : largeur dynamique selon type (image = ratio, code = 640 px, vidéo = 480 px, texte = 400 px), animée.

### 5.4 Création d'éléments
- Debug bouton "Nouveau" : vérifier callback branché, remonter erreurs `useRealFileExplorer.createFolder/createFile` via toast.
- Ajouter templates : `.txt`, `.md`, `.json`, dossier — chacun avec icône dans `NewMenu`.
- Rename inline auto-focus après création.

---

## Ordre & livraison

1. **Lot 1** (Terminal Agent) — le plus gros, livré en un commit atomique.
2. **Lot 2** (Splits arbre) — refactor ciblé `TerminalPanel`.
3. **Lot 3** (Tooltips) — transverse, rapide.
4. **Lot 4** (Réseau) — audit + unification.
5. **Lot 5** (Explorateur + Preview + Création) — le plus visuel, en dernier pour capitaliser sur les tooltips du lot 3.

Chaque lot : build vert, test manuel, capture visuelle si UI, avant de passer au suivant.

## Détails techniques clés

- **Edge function `terminal-suggest`** : ajouter mode `chat` (simple Q/R conversationnel, pas d'action).
- **AgentRunner** : machine à états explicite, événements `onStep`, `onCommand`, `onOutput`, `onDone`. Testable indépendamment.
- **Aucune régression** sur `ia --explain`, `ia --fix`, cache LRU des suggestions.
- **i18n** : toutes les nouvelles chaînes passent par `LanguageContext`.
- **Design tokens** : respect strict Midnight Indigo, aucune couleur hardcodée.

---

Confirme le plan (ou indique les ajustements) et j'attaque le **Lot 1** immédiatement.
