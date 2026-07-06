/**
 * Break an output line into typed tokens so we can render clickable pieces
 * (paths, IPs, URLs, PIDs…). Very forgiving — false positives are cheap.
 */

export type TokKind = 'dir' | 'file' | 'path' | 'url' | 'ip' | 'port' | 'pid' | 'hash' | 'email' | 'flag' | 'num' | 'text';

export interface Tok {
  kind: TokKind;
  text: string;
  /** Value passed to the terminal when clicked (may be quoted). */
  insert: string;
}

const RX_URL = /https?:\/\/[^\s"']+/g;
const RX_IPPORT = /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/g;
const RX_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const RX_HASH = /\b(?=[a-f0-9]*[a-f])[a-f0-9]{7,40}\b/g;
const RX_WINPATH = /(?:[A-Z]:\\|\\\\)[^\s"'|<>]+/g;
const RX_UNIXPATH = /(?:\.{0,2}\/|~\/)[^\s"'|<>:,]+/g;
const RX_PID = /\bPID[\s:]+(\d{2,7})\b/g;

interface Range { start: number; end: number; kind: TokKind; text: string; insert: string; }

function quote(s: string) {
  return /\s/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

function isDirName(name: string): boolean {
  return /\/$/.test(name) || /^d[rwx-]{9}/.test(name) || name.startsWith('<DIR>');
}

function looksLikeName(value: string): boolean {
  if (!value || value.length > 160) return false;
  if (/^\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}$/.test(value)) return false;
  if (/^\d{1,2}:\d{2}(:\d{2})?(AM|PM)?$/i.test(value)) return false;
  if (/^(AM|PM|Mode|LastWriteTime|Length|Name|Directory:)$/i.test(value)) return false;
  if (/^[.,;:|]+$/.test(value)) return false;
  return /[A-Za-zÀ-ÿ_.-]/.test(value);
}

/**
 * Detect PowerShell `Get-ChildItem`-style output rows:
 *   Mode                 LastWriteTime         Length Name
 *   d----          10/12/2025    12:34                MyFolder
 *   -a---          10/12/2025    12:34         1234   file.txt
 */
function detectPsListing(line: string): { name: string; isDir: boolean } | null {
  const m = /^\s*([dl-][rwxas-]{4,6}|\S{1,7})\s+\d{1,4}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\s+(?:\d+\s+)?(\S.*)$/.exec(line);
  if (!m) return null;
  return { name: m[2].trim(), isDir: m[1].startsWith('d') };
}

function detectCmdListing(line: string): { name: string; isDir: boolean } | null {
  const m = /^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\s+(<DIR>|[\d,]+)\s+(.+)$/.exec(line);
  if (!m) return null;
  return { name: m[2].trim(), isDir: m[1] === '<DIR>' };
}

function collectPlainNames(line: string): Range[] {
  if (!line.trim()) return [];
  if (/\b(Mode|LastWriteTime|Length|Name|Directory of|total)\b/i.test(line)) return [];
  if (/\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}\s+\d{1,2}:\d{2}/.test(line)) return [];
  const ranges: Range[] = [];
  const re = /[^\s]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const text = m[0].replace(/[,:;]+$/g, '');
    if (!looksLikeName(text)) continue;
    const isDir = /\/$/.test(text) || !/\.[A-Za-z0-9]{1,8}$/.test(text);
    ranges.push({ start: m.index, end: m.index + text.length, kind: isDir ? 'dir' : 'file', text, insert: quote(text.replace(/\/$/, '')) });
  }
  return ranges.length <= 12 ? ranges : [];
}

/**
 * Detect Unix `ls -l` rows: `drwxr-xr-x 12 user grp 4096 Jan 1 12:34 folder`
 */
function detectUnixLs(line: string): { name: string; isDir: boolean } | null {
  const m = /^([d-])[rwx-]{9}\s+\d+\s+\S+\s+\S+\s+\d+\s+\S+\s+\d+\s+\S+\s+(.+)$/.exec(line);
  if (!m) return null;
  return { name: m[2], isDir: m[1] === 'd' };
}

export function tokenize(line: string): Tok[] {
  const ranges: Range[] = [];

  // First: whole-line detectors (Windows/Unix listings)
  const ps = detectPsListing(line);
  if (ps) {
    const start = line.lastIndexOf(ps.name);
    if (start >= 0) {
      ranges.push({
        start, end: start + ps.name.length,
        kind: ps.isDir ? 'dir' : 'file',
        text: ps.name,
        insert: quote(ps.name),
      });
    }
  }
  const unix = !ps ? detectUnixLs(line) : null;
  if (unix) {
    const start = line.lastIndexOf(unix.name);
    if (start >= 0) {
      ranges.push({
        start, end: start + unix.name.length,
        kind: unix.isDir ? 'dir' : 'file',
        text: unix.name,
        insert: quote(unix.name),
      });
    }
  }
  const cmd = (!ps && !unix) ? detectCmdListing(line) : null;
  if (cmd) {
    const start = line.lastIndexOf(cmd.name);
    if (start >= 0) {
      ranges.push({ start, end: start + cmd.name.length, kind: cmd.isDir ? 'dir' : 'file', text: cmd.name, insert: quote(cmd.name) });
    }
  }

  if (!ps && !unix && !cmd) ranges.push(...collectPlainNames(line));

  const collect = (re: RegExp, kind: TokKind, buildInsert?: (m: RegExpExecArray) => string) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line))) {
      const start = m.index;
      const end = m.index + m[0].length;
      // Skip overlaps
      if (ranges.some((r) => start < r.end && end > r.start)) continue;
      ranges.push({ start, end, kind, text: m[0], insert: buildInsert ? buildInsert(m) : quote(m[0]) });
    }
  };

  collect(RX_URL, 'url');
  collect(RX_EMAIL, 'email');
  collect(RX_WINPATH, 'path');
  collect(RX_UNIXPATH, 'path');
  collect(RX_IPPORT, 'ip');
  collect(RX_PID, 'pid', (m) => m[1]);
  collect(RX_HASH, 'hash');

  ranges.sort((a, b) => a.start - b.start);

  const out: Tok[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) out.push({ kind: 'text', text: line.slice(cursor, r.start), insert: '' });
    out.push({ kind: r.kind, text: r.text, insert: r.insert });
    cursor = r.end;
  }
  if (cursor < line.length) out.push({ kind: 'text', text: line.slice(cursor), insert: '' });
  return out;
}

export const TOK_CLASS: Record<TokKind, string> = {
  dir: 'text-sky-300 hover:bg-sky-500/20 hover:text-sky-200 rounded px-0.5 cursor-pointer transition-all hover:shadow-[0_0_10px_hsl(var(--primary)/0.25)]',
  file: 'text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 rounded px-0.5 cursor-pointer transition-all hover:shadow-[0_0_10px_hsl(var(--primary)/0.2)]',
  path: 'text-cyan-300 hover:bg-cyan-500/20 rounded px-0.5 cursor-pointer transition-colors underline decoration-cyan-400/30',
  url: 'text-blue-300 hover:bg-blue-500/20 rounded px-0.5 cursor-pointer transition-colors underline decoration-blue-400/40',
  ip: 'text-fuchsia-300 hover:bg-fuchsia-500/20 rounded px-0.5 cursor-pointer transition-colors',
  port: 'text-fuchsia-200 hover:bg-fuchsia-500/20 rounded px-0.5 cursor-pointer transition-colors',
  pid: 'text-amber-300 hover:bg-amber-500/20 rounded px-0.5 cursor-pointer transition-colors',
  hash: 'text-violet-300 hover:bg-violet-500/20 rounded px-0.5 cursor-pointer transition-colors font-mono',
  email: 'text-teal-300 hover:bg-teal-500/20 rounded px-0.5 cursor-pointer transition-colors',
  flag: 'text-amber-300',
  num: 'text-fuchsia-300',
  text: 'text-muted-foreground',
};
