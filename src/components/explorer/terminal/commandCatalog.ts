/** Command catalog powering ghost text and Ctrl+Space suggestions. */

export interface CmdEntry {
  name: string;
  desc: string;
  flags?: string[];
  examples?: string[];
}

export const COMMANDS: CmdEntry[] = [
  { name: 'ls', desc: 'Lister le contenu du dossier', flags: ['-l', '-a', '-la', '-lh', '-R'] },
  { name: 'dir', desc: 'Lister le contenu (PowerShell)', flags: ['-Force', '-Recurse'] },
  { name: 'cd', desc: 'Changer de dossier', examples: ['cd ..', 'cd ~', 'cd /'] },
  { name: 'pwd', desc: 'Afficher le dossier courant' },
  { name: 'clear', desc: 'Effacer le terminal' },
  { name: 'cls', desc: 'Effacer le terminal (PowerShell)' },
  { name: 'echo', desc: 'Afficher un message' },
  { name: 'cat', desc: 'Afficher le contenu d\'un fichier' },
  { name: 'type', desc: 'Afficher le contenu (Windows)' },
  { name: 'Get-Content', desc: 'Lire un fichier (PowerShell)', flags: ['-Tail', '-Wait', '-Head'] },
  { name: 'Get-ChildItem', desc: 'Lister le contenu (PowerShell)', flags: ['-Force', '-Recurse', '-Filter'] },
  { name: 'Get-Process', desc: 'Lister les processus', flags: ['-Name', '-Id'] },
  { name: 'Get-Service', desc: 'Lister les services' },
  { name: 'Get-Location', desc: 'Dossier courant' },
  { name: 'Set-Location', desc: 'Changer de dossier' },
  { name: 'New-Item', desc: 'Créer fichier/dossier', flags: ['-ItemType', '-Name', '-Path'] },
  { name: 'Remove-Item', desc: 'Supprimer', flags: ['-Recurse', '-Force'] },
  { name: 'Copy-Item', desc: 'Copier', flags: ['-Recurse', '-Force'] },
  { name: 'Move-Item', desc: 'Déplacer' },
  { name: 'Select-String', desc: 'Grep PowerShell', flags: ['-Pattern', '-Path'] },
  { name: 'mkdir', desc: 'Créer un dossier' },
  { name: 'rmdir', desc: 'Supprimer un dossier' },
  { name: 'rm', desc: 'Supprimer', flags: ['-r', '-f', '-rf'] },
  { name: 'cp', desc: 'Copier', flags: ['-r', '-a', '-v'] },
  { name: 'mv', desc: 'Déplacer / renommer' },
  { name: 'touch', desc: 'Créer/toucher un fichier' },
  { name: 'grep', desc: 'Chercher un motif', flags: ['-r', '-i', '-n', '-v', '-E'] },
  { name: 'find', desc: 'Chercher des fichiers', flags: ['-name', '-type', '-size'] },
  { name: 'ping', desc: 'Ping réseau', flags: ['-n', '-c', '-t'] },
  { name: 'ipconfig', desc: 'Config réseau Windows', flags: ['/all', '/release', '/renew'] },
  { name: 'ifconfig', desc: 'Config réseau Unix' },
  { name: 'netstat', desc: 'Connexions réseau', flags: ['-a', '-n', '-o', '-b', '-p tcp'] },
  { name: 'curl', desc: 'Requête HTTP', flags: ['-X', '-H', '-d', '-o', '-L', '-I'] },
  { name: 'wget', desc: 'Télécharger', flags: ['-O', '-c'] },
  { name: 'ssh', desc: 'Connexion SSH', flags: ['-p', '-i', '-L'] },
  { name: 'scp', desc: 'Copie via SSH', flags: ['-r', '-P'] },
  { name: 'git', desc: 'Git', flags: ['status', 'add', 'commit', 'push', 'pull', 'clone', 'log', 'diff', 'branch', 'checkout', 'stash', 'fetch', 'reset', 'rebase'] },
  { name: 'npm', desc: 'npm', flags: ['install', 'i', 'run', 'start', 'test', 'ci', 'update'] },
  { name: 'bun', desc: 'bun', flags: ['install', 'add', 'run', 'dev', 'build', 'test'] },
  { name: 'pnpm', desc: 'pnpm', flags: ['install', 'i', 'add', 'run', 'dev', 'build'] },
  { name: 'yarn', desc: 'yarn', flags: ['install', 'add', 'run', 'start', 'dev'] },
  { name: 'node', desc: 'Node.js', flags: ['-v', '-e', '-p'] },
  { name: 'python', desc: 'Python', flags: ['-V', '-c', '-m'] },
  { name: 'python3', desc: 'Python 3' },
  { name: 'docker', desc: 'Docker', flags: ['ps', 'run', 'build', 'exec', 'logs', 'compose', 'pull', 'images', 'stop', 'rm'] },
  { name: 'kubectl', desc: 'Kubernetes', flags: ['get', 'apply', 'delete', 'logs', 'exec', 'describe'] },
  { name: 'code', desc: 'VS Code', flags: ['.', '--help'] },
  { name: 'help', desc: 'Aide interne du terminal' },
  { name: 'exit', desc: 'Fermer le terminal' },
  { name: 'history', desc: 'Historique des commandes' },
  { name: 'whoami', desc: 'Utilisateur courant' },
  { name: 'hostname', desc: 'Nom d\'hôte' },
  { name: 'date', desc: 'Date/heure' },
  { name: 'tasklist', desc: 'Processus Windows', flags: ['/svc'] },
  { name: 'taskkill', desc: 'Tuer un processus Windows', flags: ['/PID', '/IM', '/F'] },
  { name: 'systeminfo', desc: 'Infos système Windows' },
  { name: 'tree', desc: 'Arbre du dossier', flags: ['/f', '-L'] },
];

export function findCommand(prefix: string): CmdEntry[] {
  if (!prefix) return [];
  const p = prefix.toLowerCase();
  return COMMANDS.filter((c) => c.name.toLowerCase().startsWith(p)).slice(0, 8);
}

export function findFlag(command: string, prefix: string): string[] {
  const entry = COMMANDS.find((c) => c.name.toLowerCase() === command.toLowerCase());
  if (!entry?.flags) return [];
  return entry.flags.filter((f) => f.toLowerCase().startsWith(prefix.toLowerCase())).slice(0, 8);
}

export const KEYWORDS = new Set([
  'if', 'else', 'elseif', 'foreach', 'for', 'while', 'do', 'switch', 'return',
  'function', 'param', 'try', 'catch', 'finally', 'throw', 'break', 'continue',
  'in', 'not', 'and', 'or', 'true', 'false', 'null',
]);
