# Plan — Terminal Ultra + FTP unifié + Cloud panel + Menus contextuels

Grosse itération centrée sur le **terminal**, avec en complément la refonte du dialog FTP, l'égalisation de la colonne cloud, et la correction des actions de menus contextuels.

---

## 1. Menus contextuels — actions réelles (fin des "Simulation")

Fichier : `src/components/explorer/ExplorerTab.tsx` (handler `handleCtxAction`, ligne ~273) + `contextMenuConfig.tsx` pour quelques cas manquants.

- Câbler **toutes** les actions actuellement en `default: explorerToast.info('Action : …', 'Simulation')` sur des opérations réelles ou explicitement "à faire côté serveur" avec message clair :
  - `sort.name|type|date`, `view.icons.large|medium|small` → applique le tri/vue via `explorer` (nouvelle méthode `setSortOrder`/`setViewMode` déjà existantes ou ajout dans le hook).
  - `desktop.refresh`, `refresh` → `explorer.refresh()` (ajouter si absent) + toast.
  - `desktop.open-terminal`, `desktop.open-explorer` → ouvre le terminal / focus explorer.
  - `send.desktop|zip|mail` → délégué au job `ops.startJob({ type: 'copy'|'compress'|'share', … })`.
  - `git.*`, `server.*`, `drive.*`, `mobile.*`, `net.*` → appels réels vers `/api/github/*`, `/api/servers/*`, ou message "action non disponible dans le navigateur" mais **jamais** le mot "Simulation".
  - `new.folder|txt|docx|xlsx|pptx|code` → création réelle via l'API sources (POST `/api/fs/mkdir` ou `/api/fs/write`) quand une source réelle est active, sinon dans le mock avec type/extension corrects.
  - `share` → invoque `navigator.share` si dispo, sinon copie du lien dans le presse-papier.
- Supprimer le `default → Simulation`. Fallback : `console.warn('unhandled ctx action', id)` + toast neutre "Action non disponible".

---

## 2. Terminal — refonte majeure (le gros du travail)

Fichier principal : `src/components/explorer/TerminalPanel.tsx` (réécrit). Nouveaux fichiers :

- `src/components/explorer/terminal/TerminalHeader.tsx` — barre de titre avec profils, split, layouts, options.
- `src/components/explorer/terminal/TerminalView.tsx` — une "vue" (pane) : historique + input + streaming + coloration + suggestions.
- `src/components/explorer/terminal/TerminalSplit.tsx` — conteneur split (1/2/3/4 vues) via `ResizablePanelGroup`.
- `src/components/explorer/terminal/ansi.ts` — parseur ANSI → segments colorés.
- `src/components/explorer/terminal/highlight.ts` — coloration syntaxique de la **commande** en cours (mots‑clés PS, opérateurs, chemins, options `-Foo`, chaînes, variables `$env:…`).
- `src/components/explorer/terminal/tokenize.ts` — parse la **sortie** en tokens cliquables (nom de fichier/dossier, IP, port, URL, hash, chemin, PID).
- `src/components/explorer/terminal/completions.ts` — moteur d'autocomplétion + ghost text.
- `src/components/explorer/terminal/commandCatalog.ts` — dictionnaire de commandes (PS + POSIX) avec descriptions, flags, exemples.

### 2.1 Streaming des réponses

- Nouvelle route serveur `POST /api/terminal/stream` en **SSE** dans `scripts/explorer-server.mjs`. Elle spawn le shell et pipe `stdout`/`stderr` en events `data`/`err`/`end` avec le `code`. Le front consomme via `EventSource`/`fetch` + reader.
- Chaque chunk s'insère en temps réel dans la vue (au lieu d'un `append` unique à la fin). Un caret animé "▍" clignote en fin de flux tant que le process tourne.
- Bouton **Interrompre (Ctrl+C)** actif pendant l'exécution → `DELETE /api/terminal/stream/:jobId`.
- Effet sonore discret au démarrage/fin (`start.wav`, `done.wav`, `err.wav`) via `useSound`. Micro-animation d'onde sur la ligne du prompt pendant exécution.

### 2.2 Coloration syntaxique (input + output)

- **Input** : par-dessus l'`<input>` on rend un `<div>` positionné en absolu avec les tokens colorés (technique classique input-mirror). Couleurs sémantiques via tokens CSS (`--term-kw`, `--term-str`, `--term-num`, `--term-flag`, `--term-path`, `--term-var`) définis dans `explorer.css`.
- **Output** : après réception, on passe chaque ligne dans `tokenize.ts` → produit des spans typés :
  - `dir` / `file` (détectés via `ls`, `dir`, `Get-ChildItem`, présence d'un `\\` ou `/`),
  - `url`, `ip`, `port`, `pid`, `hash sha`, `email`.
  - Les codes ANSI (`\x1b[31m…`) sont convertis en classes couleur.
- Chaque token est **cliquable** : au clic → `insertAtCursor(token.text)` dans l'input de la vue active (avec quoting si espaces). Hover : soulignement + tooltip "Ajouter à la commande". Ctrl+Clic sur un dossier = `cd <token>` direct. Double‑clic sur un fichier = `Get-Item <token>` ou action contextuelle.

### 2.3 Autocomplétion + ghost text

- Déclenché à chaque `input` change. Sources fusionnées, triées par pertinence :
  1. **Historique** (préfixe match, plus récentes en tête).
  2. **Catalogue** de commandes (`commandCatalog.ts`) — noms + flags de la commande courante.
  3. **Sortie précédente** — pour l'argument, on propose les tokens `dir`/`file`/`ip`/`url` extraits des N dernières sorties.
  4. **Système de fichiers** — pour un argument qui ressemble à un chemin, appel léger `POST /api/fs/complete` (nouvelle route) qui renvoie les entrées du dossier courant du terminal.
- **Ghost text** : le meilleur candidat s'affiche en gris clair à la suite du texte tapé ; `Tab` ou `→` (en fin de ligne) l'accepte. `Ctrl+Espace` ouvre le **popup de suggestions** (liste flottante ancrée sur le curseur, navigation clavier ↑↓, `Enter` valide, `Esc` ferme). Animation d'apparition `fade-in + scale-in`.

### 2.4 Suggestion IA de la suite

- Une case cochable "IA" dans le header active un mode où après l'exécution d'une commande, on envoie **historique récent + dernière sortie tronquée + cwd** à `POST /api/ai/next-command` (nouvelle Edge Function `terminal-suggest` sur Lovable AI Gateway, modèle par défaut `google/gemini-2.5-flash`, gratuit). Le résultat propose 1–3 commandes suivantes affichées en chips sous l'output, cliquables → remplit l'input.
- Streaming de la suggestion (SSE) pour un affichage progressif.
- Un secret `LOVABLE_API_KEY` déjà présent quand Cloud est actif, sinon on affiche un badge "Activer Lovable AI".

### 2.5 Header du terminal — options avancées

Refonte de la barre existante (`TerminalPanel` lignes 174‑203). Nouveaux éléments alignés à droite :

- **Sélecteur de profil** : PowerShell / Bash (WSL) / CMD / Node REPL / Python REPL — icônes distinctes, chaque profil définit son shell côté serveur.
- **Bouton Split** avec menu déroulant : "Diviser à droite", "Diviser en bas", "Diviser 2×2", "Diviser 3 colonnes", "Fusionner (fermer autres vues)".
- **Layouts prédéfinis** : boutons rapides avec petites icônes (1, 2H, 2V, 2×2, 3col).
- **Bouton "Nouveau"** (+) : ajoute un onglet interne au terminal (chaque vue peut avoir ses onglets).
- **Chercher (Ctrl+F)** : ouvre une barre de recherche in-terminal (`highlight` + `n`/`N`).
- **Effacer**, **Copier tout**, **Exporter (.txt / .html)**, **Paramètres** (dialog : police, taille, opacité, sons on/off, IA on/off, thème).
- **Ouvrir dans un onglet** conservé.
- **Fermer**.

Le header reste très compact (h-7) grâce à des icon buttons et un menu débordant `MoreVertical`.

### 2.6 Split terminal (multi-vues)

- État `terminalLayout: { orientation: 'h'|'v'|'grid', panes: PaneState[] }` géré au niveau de `TerminalPanel` (ou remonté à `ExplorerTab` si besoin de persister).
- Chaque `PaneState` : `{ id, cwd, tabs: [{ id, title, history, lines, streamJobId? }], activeTabId }`.
- Rendu via `ResizablePanelGroup` imbriqués. La vue focus a une bordure `ring-1 ring-primary/40`. Clic dans une vue = focus. Raccourcis : `Alt+←/→/↑/↓` change de vue, `Ctrl+Shift+D` split, `Ctrl+Shift+W` ferme la vue courante.
- Presse-papiers isolé par vue mais **glisser un token** d'une vue à l'autre l'insère dans son input (drag natif HTML5).

### 2.7 Micro-interactions & effets

- **Curseur** : bloc plein qui pulse à 1 s (variable CSS `--term-caret-speed`), s'accélère pendant la frappe.
- **Prompt** : léger dégradé emerald → cyan, avec pastille d'état (● verte OK, rouge erreur code≠0, ambre en cours).
- **Sons** discrets (togglables) : `keypress` très bas volume, `enter`, `success`, `error`, `bell` (sur `\a`).
- **Animations** : `fade-in` sur chaque nouvelle ligne, `slide-in-right` sur les chips IA, `scale-in` sur le popup autocomplete.
- **Timer d'exécution** affiché à droite de la ligne de commande une fois terminée : `142 ms` (vert) / `1.4 s` (ambre) / `>10 s` (rouge).
- **Coloration du statut** : chaque groupe cmd+output est encadré à gauche par une fine barre 2px colorée (succès/erreur/en cours) — cliquable pour replier/dérouler l'output long.
- **Copie contextuelle** : sélection texte → menu flottant "Copier / Copier en ligne de commande / Coller en tant qu'argument dans vue X".

### 2.8 Suppression des limitations

- Retirer les cases `switch (head)` interceptées (`pwd`, `cd`, `mkdir`, `clear`) : tout est passé au shell réel, seul `clear`/`cls` reste local pour la vue. `cd` reste local pour synchroniser `terminalCwd` mais utilise `Set-Location`+`Get-Location` réel.
- Historique persistant par vue (`localStorage: terminal.history.v2`) sans limite haute (garde les 5000 dernières).
- Aucune troncature du buffer : pagination virtualisée avec `react-window` si > 2000 lignes pour rester fluide.
- Aucune restriction sur les commandes ; ajout `env`, pipe, redirections déjà supportés par le shell.

---

## 3. Dialog "Nouvelle connexion" — regrouper FTP/FTPS/SFTP

Fichier : `src/components/explorer/NewConnectionDialog.tsx`.

- **Colonne de gauche** : fusionner les trois entrées en une seule carte **"FTP"** (icône serveur unique) avec hint "FTP, FTPS ou SFTP".
- **Panneau de droite quand FTP est sélectionné** :
  - En tête : un **RadioGroup horizontal** stylé pilule "FTP · FTPS · SFTP".
  - Le choix ajuste dynamiquement : `defaultPort` (21 / 990 / 22), le champ `secure` (auto‑true pour FTPS), l'affichage d'une note (SFTP = SSH, clé privée facultative), et un champ **"Clé privée (SFTP)"** optionnel visible uniquement en SFTP.
  - Champs communs : nom, hôte, port, user, password, chemin distant (optionnel), mode passif (case à cocher visible pour FTP/FTPS).
- **Test obligatoire avant enregistrement** :
  - Bouton **"Tester la connexion"** (affiché à gauche du bouton "Enregistrer"), état `idle → testing → success → error`, avec pastille verte/rouge + message serveur retourné.
  - Le bouton "Enregistrer" est **désactivé tant que le test n'est pas passé au vert** pour toutes les sources qui ont un endpoint testable (FTP/FTPS/SFTP, SMB, WebDAV, S3, iCloud, Dropbox…). Un lien "Enregistrer quand même" reste possible mais grisé et discret.
  - Ajouter côté serveur `POST /api/sftp/test`, `POST /api/webdav/test`, `POST /api/smb/test`, `POST /api/s3/test`, `POST /api/cloud/test` (mock validation format + ping HTTP si applicable) — voir §5.
- Panneau droit repensé pour ne pas overflow : `overflow-y-auto max-h-[70vh]` + `pr-2` + scrollbar fine.

---

## 4. Sidebar cloud — hauteur fixe + scrollbar fine

Fichier : `src/components/explorer/ExplorerSidebar.tsx` (section "Cloud" / sources).

- Wrapper la liste des services cloud dans un conteneur `max-h-[calc(100vh-var(--sidebar-header-h)-…)]` **ou** simplement une hauteur fixe alignée sur la hauteur du panneau de droite (mesurée via `ResizeObserver` sur le panneau frère).
- `overflow-y-auto` + classe utilitaire `.thin-scrollbar` (nouvelle, dans `explorer.css`) :
  ```css
  .thin-scrollbar::-webkit-scrollbar { width: 4px; }
  .thin-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground)/.3); border-radius: 4px; }
  .thin-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)/.5); }
  .thin-scrollbar { scrollbar-width: thin; scrollbar-color: hsl(var(--muted-foreground)/.3) transparent; }
  ```
- Même traitement sur la colonne gauche du dialog Nouvelle connexion.

---

## 5. Détails techniques

- **SSE côté client** : petit helper `src/lib/sse.ts` qui expose `openStream(url, body, { onData, onErr, onEnd })` basé sur `fetch` + `ReadableStream` (compatible POST, contrairement à `EventSource`).
- **Complétion FS** : route `POST /api/fs/complete { cwd, prefix }` → renvoie 50 entrées max (dossiers d'abord). Cache LRU 30 s côté client.
- **Edge Function IA** `supabase/functions/terminal-suggest/index.ts` : reçoit `{ history, lastOutput, cwd }`, appelle Lovable AI Gateway avec un prompt court "propose 1–3 commandes suivantes concises, format JSON `{cmd, why}`", stream la réponse.
- **Persistance terminal** : layout, profils, historique, préférences (sons, IA, thème) dans `localStorage: terminal.state.v1`.
- **Accessibilité** : rôles `role="log" aria-live="polite"` sur l'output, `aria-autocomplete="list"` sur l'input, focus visibles.

---

## Ordre d'exécution

1. Corrections menus contextuels (§1) — rapide, dé-simule tout de suite.
2. FTP unifié + tests obligatoires (§3) + hauteur cloud (§4) — mêmes fichiers, on regroupe.
3. Terminal : refonte structurelle (split, header, profils) — nouveaux fichiers.
4. Terminal : streaming SSE + coloration input/output + tokens cliquables.
5. Terminal : autocomplétion + ghost text + popup suggestions.
6. Terminal : IA "next command" + Edge Function.
7. Terminal : micro‑interactions, sons, timer, animations.

Résultat : un terminal web sur mesure au-delà de VS Code, un dialog de connexion propre et testé, et zéro action fantôme dans les menus.