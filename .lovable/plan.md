# Plan — Terminal cognitif · phases

## Phase 1 (ce tour) — Multi-fournisseur IA + résilience agent
- `src/lib/aiProviders.ts` : registre localStorage + client unifié (OpenAI, Anthropic, Google Gemini, OpenRouter, Ollama local, custom OpenAI-compatible, fallback Lovable AI Gateway via edge function). Modes : suggest, agent, explain, chat. Auto-switch sur 401/403/429/5xx/timeout.
- `src/components/explorer/terminal/AiSettingsDialog.tsx` : gestion fournisseurs, clés, base URLs, modèles, ordre, test connexion, fetch modèles.
- `src/components/explorer/terminal/ModelPicker.tsx` : dropdown header (fournisseur actif + modèle + status).
- `TerminalHeader` : bouton settings + model picker.
- `TerminalView.runAgentLoop` : au lieu de `break` sur erreur IA, ré-injecte l'erreur comme contexte pour l'itération suivante, avec bascule provider automatique. Erreurs shell restent traitées par l'agent.
- `TerminalView` : remplace tous les `supabase.functions.invoke('terminal-suggest', …)` par `callAI(mode, …)`.

## Phase 2 — Chat & UX
- Pièces jointes dans AgentChatPane (drag/drop, lecture texte + parse binaire via markitdown côté serveur).
- Rendu Markdown + coloration syntaxique (Prism) pour blocs de code renvoyés par l'IA.
- Menu contextuel automatique sur sélection dans le terminal.
- Tooltips riches (survol lien = fetch meta, IP = whois, hash = lookup).
- Clic sur token = choix "ouvrir / insérer".

## Phase 3 — Explorer
- Modale de saisie de nom pour "Nouveau dossier / Nouveau fichier".
- Vérification et harmonisation des menus contextuels.
