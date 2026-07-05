import { COMMANDS, KEYWORDS } from './commandCatalog';

export type HlKind = 'cmd' | 'flag' | 'str' | 'num' | 'var' | 'path' | 'kw' | 'op' | 'plain';

export interface HlToken {
  kind: HlKind;
  text: string;
}

const COMMAND_NAMES = new Set(COMMANDS.map((c) => c.name.toLowerCase()));

const OPERATORS = /^(\|{1,2}|&{1,2}|>>?|<<?|;|=>|::|-eq|-ne|-gt|-lt|-ge|-le)/;

/**
 * Very small tokenizer good enough for coloration in an input mirror.
 * Not a real PowerShell parser — recognises common shapes.
 */
export function highlight(input: string): HlToken[] {
  const out: HlToken[] = [];
  let i = 0;
  let seenCmd = false;

  const push = (kind: HlKind, text: string) => {
    if (!text) return;
    // Merge consecutive `plain` runs to keep the DOM small.
    const last = out[out.length - 1];
    if (last && last.kind === kind && kind === 'plain') last.text += text;
    else out.push({ kind, text });
  };

  while (i < input.length) {
    const c = input[i];

    // Whitespace
    if (/\s/.test(c)) {
      let j = i;
      while (j < input.length && /\s/.test(input[j])) j++;
      push('plain', input.slice(i, j));
      i = j;
      continue;
    }

    // Comment
    if (c === '#') {
      push('plain', input.slice(i));
      break;
    }

    // Strings
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < input.length && input[j] !== quote) {
        if (input[j] === '\\') j += 2;
        else j++;
      }
      j = Math.min(j + 1, input.length);
      push('str', input.slice(i, j));
      i = j;
      continue;
    }

    // Variable $foo / $env:PATH
    if (c === '$') {
      let j = i + 1;
      while (j < input.length && /[A-Za-z0-9_:]/.test(input[j])) j++;
      push('var', input.slice(i, j));
      i = j;
      continue;
    }

    // Number
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      push('num', input.slice(i, j));
      i = j;
      continue;
    }

    // Operator
    const opMatch = OPERATORS.exec(input.slice(i));
    if (opMatch) {
      push('op', opMatch[0]);
      i += opMatch[0].length;
      seenCmd = false; // next token becomes a command
      continue;
    }

    // Flag: -foo / --bar / /foo (Windows)
    if (c === '-' || (c === '/' && seenCmd && /[A-Za-z]/.test(input[i + 1] || ''))) {
      let j = i + 1;
      while (j < input.length && /[A-Za-z0-9_-]/.test(input[j])) j++;
      push('flag', input.slice(i, j));
      i = j;
      continue;
    }

    // Word: command, keyword, path, or plain
    if (/[A-Za-z0-9_./\\:~-]/.test(c)) {
      let j = i;
      while (j < input.length && /[^\s|&;<>"']/.test(input[j])) j++;
      const word = input.slice(i, j);
      const lower = word.toLowerCase();
      if (!seenCmd && COMMAND_NAMES.has(lower)) {
        push('cmd', word);
        seenCmd = true;
      } else if (KEYWORDS.has(lower)) {
        push('kw', word);
      } else if (/[\\/]/.test(word) || word.startsWith('~') || /^[A-Z]:/.test(word)) {
        push('path', word);
      } else {
        push('plain', word);
      }
      i = j;
      continue;
    }

    push('plain', c);
    i++;
  }

  return out;
}

export const HL_CLASS: Record<HlKind, string> = {
  cmd: 'text-emerald-300',
  flag: 'text-amber-300',
  str: 'text-orange-200',
  num: 'text-fuchsia-300',
  var: 'text-cyan-300',
  path: 'text-sky-300 underline decoration-sky-400/30',
  kw: 'text-violet-300',
  op: 'text-rose-300',
  plain: 'text-foreground',
};
