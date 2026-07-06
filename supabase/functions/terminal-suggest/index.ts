// Suggest next terminal commands using Lovable AI Gateway.
// Returns { suggestions: string[] } — 1 to 3 concise shell commands.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { history = [], lastCommand = '', lastOutput = '', cwd = '', profile = 'powershell', prompt = '' } = await req.json();

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ suggestions: [], error: 'LOVABLE_API_KEY missing' }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    const system = `Tu es un assistant terminal expert (${profile}). Propose des commandes sûres, concises, prêtes à exécuter pour le dossier courant. Si l'utilisateur donne un objectif, transforme-le en 1 à 5 commandes candidates. Sinon, déduis la prochaine commande utile depuis la dernière sortie. Réponds STRICTEMENT en JSON: {"suggestions":["cmd1","cmd2"]}. Pas d'explication. Pas de markdown.`;

    const user = `cwd: ${cwd}
historique récent: ${history.slice(-5).join(' | ')}
dernière commande: ${lastCommand}
objectif utilisateur: ${prompt}
sortie tronquée:
${lastOutput.slice(-1000)}

Propose la ou les commandes suivantes utiles.`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ suggestions: [], error: txt.slice(0, 200) }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' },
        status: 200,
      });
    }

    const payload = await res.json();
    const raw = payload?.choices?.[0]?.message?.content || '{}';
    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions.filter((s: unknown) => typeof s === 'string').slice(0, 3);
      }
    } catch { /* ignore parse error */ }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ suggestions: [], error: (err as Error).message }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
      status: 200,
    });
  }
});
