// Detects potentially destructive shell commands so the agent asks for
// confirmation before executing them.

export interface DangerVerdict {
  dangerous: boolean;
  reason?: string;
}

const PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b/i, reason: 'Suppression récursive et forcée (rm -rf)' },
  { re: /\brm\s+-[a-z]*r\b.*\/(\s|$)/i, reason: 'Suppression récursive à la racine' },
  { re: /\bRemove-Item\b.*(-Recurse|-Force)/i, reason: 'Suppression PowerShell récursive/forcée' },
  { re: /\bdel\s+\/[sq]/i, reason: 'Suppression massive (del /S ou /Q)' },
  { re: /\bformat\s+[a-z]:/i, reason: 'Formatage de disque' },
  { re: /\bmkfs(\.[a-z0-9]+)?\b/i, reason: 'Création de système de fichiers (mkfs)' },
  { re: /\bdd\s+.*\bof=\/dev\//i, reason: 'Écriture brute sur un périphérique (dd)' },
  { re: /\bshutdown\b/i, reason: 'Arrêt système' },
  { re: /\breboot\b/i, reason: 'Redémarrage système' },
  { re: />\s*\/dev\/sd[a-z]/i, reason: 'Redirection vers un disque brut' },
  { re: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, reason: 'Suppression de table/base SQL' },
  { re: /\bTRUNCATE\s+TABLE\b/i, reason: 'Truncate SQL' },
  { re: /\bchmod\s+-R\s+777\b/i, reason: 'Permissions ouvertes en récursif' },
  { re: /:\(\)\s*\{\s*:\|:&\s*\}\s*;/, reason: 'Fork bomb' },
  { re: /\bgit\s+push\s+.*--force\b/i, reason: 'git push --force' },
  { re: /\bgit\s+reset\s+--hard\b/i, reason: 'git reset --hard' },
];

export function assessDanger(command: string): DangerVerdict {
  const cmd = (command || '').trim();
  if (!cmd) return { dangerous: false };
  for (const { re, reason } of PATTERNS) {
    if (re.test(cmd)) return { dangerous: true, reason };
  }
  return { dangerous: false };
}
