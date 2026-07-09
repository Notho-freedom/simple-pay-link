// Terminal AI backend — modes: suggest, agent, explain, chat.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
    status,
  });
}

async function callAI(system: string, user: string, opts: { json?: boolean } = { json: true }) {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Lovable-API-Key': LOVABLE_API_KEY!,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      ...(opts.json !== false ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`gateway ${res.status}: ${txt.slice(0, 240)}`);
  }
  const payload = await res.json();
  return payload?.choices?.[0]?.message?.content || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) return jsonResponse({ error: 'LOVABLE_API_KEY missing' }, 500);

    const body = await req.json();
    const {
      mode = 'suggest',
      history = [],
      lastCommand = '',
      lastOutput = '',
      lastCode = 0,
      cwd = '',
      profile = 'powershell',
      prompt = '',
      goal = '',
      iteration = 0,
      projectContext = '',
      messages = [],
    } = body;

    // ── AGENT MODE ──────────────────────────────────────────────
    if (mode === 'agent') {
      const system = `Tu es un AI Agent Terminal autonome (${profile}) qui atteint l'objectif de l'utilisateur en une série d'itérations.

RÈGLES STRICTES :
- Réponds UNIQUEMENT en JSON compact : {"action":"run|done|abort","command":"...","reason":"...","summary":"...","step":"..."}. Pas de markdown, pas de texte hors JSON.
- action="run" : propose UNE SEULE commande shell prête à exécuter. C'est le mode par défaut à l'itération 1 dès qu'un plan est possible.
- action="done" : uniquement si la sortie précédente prouve l'objectif atteint.
- action="abort" : uniquement en dernier recours (objectif ambigu au point d'être impossible, ou 3 échecs identiques consécutifs). N'abandonne JAMAIS à l'itération 1.
- Si la dernière commande a échoué (code ≠ 0), analyse la sortie et propose une commande de correction ciblée.
- "step" : verbe d'action court (3–6 mots) décrivant ce que fait cette itération — ex "Détection technologie", "Installation dépendances", "Build du projet", "Correction erreur TS".
- Interdits : commandes destructives (rm -rf /, format, dd, mkfs, shutdown, > /dev/sd*), commandes interactives bloquantes (nano, vim, top sans limite, ssh sans -o BatchMode=yes), commandes qui attendent une entrée clavier.
- Préfère les commandes non-interactives : npm ci vs npm install, --yes, --non-interactive, --no-input.

Adapte-toi à ${profile} (PowerShell = Get-ChildItem, Remove-Item ; bash/zsh = ls, rm ; cmd = dir, del).`;

      const user = `OBJECTIF : ${goal}
CWD : ${cwd}
ITÉRATION : ${iteration}
${projectContext ? `CONTEXTE PROJET :\n${projectContext}\n` : ''}
DERNIÈRE COMMANDE : ${lastCommand || '(aucune)'}
CODE RETOUR : ${lastCode}
SORTIE (fin, tronquée) :
${(lastOutput || '(vide)').slice(-1800)}

Décide de la prochaine action.`;

      const raw = await callAI(system, user);
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(raw); } catch { /* ignore */ }
      let action = ['run', 'done', 'abort'].includes(parsed.action as string) ? (parsed.action as string) : 'abort';
      // Sécurité : ne jamais abort dès l'itération 1 si on peut essayer une commande
      if (action === 'abort' && iteration <= 1 && typeof parsed.command === 'string' && parsed.command.trim()) {
        action = 'run';
      }
      return jsonResponse({
        action,
        command: typeof parsed.command === 'string' ? parsed.command : '',
        reason: typeof parsed.reason === 'string' ? parsed.reason : '',
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        step: typeof parsed.step === 'string' ? parsed.step : '',
      });
    }

    // ── EXPLAIN MODE ────────────────────────────────────────────
    if (mode === 'explain') {
      const system = `Tu es un expert shell (${profile}). Explique une commande en 3-6 lignes claires en français. Structure : rôle, options clés, effet, risques éventuels. Réponds JSON : {"explanation":"..."}`;
      const raw = await callAI(system, `Commande : ${prompt}`);
      let parsed: { explanation?: string } = {};
      try { parsed = JSON.parse(raw); } catch { /* ignore */ }
      return jsonResponse({ explanation: parsed.explanation || '' });
    }

    // ── CHAT MODE (conversationnel, non-agent) ──────────────────
    if (mode === 'chat') {
      const system = `Tu es Cognitive Assistant, intégré à un terminal moderne. Tu réponds en français, chaleureux, concis (2–8 lignes). Tu peux proposer des commandes shell (${profile}) dans des blocs de code quand c'est pertinent. Pas de markdown lourd, privilégie la lisibilité en terminal.`;
      const chatMessages = Array.isArray(messages) && messages.length
        ? messages
        : [{ role: 'user', content: prompt }];
      const conversation = chatMessages
        .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Utilisateur' : 'Assistant'} : ${m.content}`)
        .join('\n\n');
      const raw = await callAI(system, conversation, { json: false });
      return jsonResponse({ reply: raw });
    }

    // ── SUGGEST MODE (défaut) ───────────────────────────────────
    const system = `Tu es un assistant terminal expert (${profile}). Propose des commandes sûres, concises, prêtes à exécuter. Si l'utilisateur donne un objectif, transforme-le en 1 à 5 commandes candidates. Sinon, déduis la prochaine commande utile depuis la dernière sortie. Réponds STRICTEMENT en JSON : {"suggestions":["cmd1","cmd2"]}. Pas d'explication.`;

    const user = `cwd: ${cwd}
historique récent : ${history.slice(-5).join(' | ')}
dernière commande : ${lastCommand}
objectif utilisateur : ${prompt}
sortie tronquée :
${(lastOutput || '').slice(-1000)}

Propose la ou les commandes suivantes utiles.`;

    const raw = await callAI(system, user);
    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions.filter((s: unknown) => typeof s === 'string').slice(0, 5);
      }
    } catch { /* ignore */ }

    return jsonResponse({ suggestions });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message, suggestions: [] }, 200);
  }
});
