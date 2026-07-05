import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { GitBranch, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  oldLine?: number;
  newLine?: number;
  text: string;
}

const mockDiff = (filename: string): DiffLine[] => {
  // Hardcoded variations per common filenames
  if (filename.endsWith('package.json')) {
    return [
      { type: 'unchanged', oldLine: 1, newLine: 1, text: '{' },
      { type: 'unchanged', oldLine: 2, newLine: 2, text: '  "name": "explorer",' },
      { type: 'removed', oldLine: 3, text: '  "version": "1.0.0",' },
      { type: 'added', newLine: 3, text: '  "version": "1.1.0",' },
      { type: 'unchanged', oldLine: 4, newLine: 4, text: '  "dependencies": {' },
      { type: 'added', newLine: 5, text: '    "framer-motion": "^11.0.0",' },
      { type: 'unchanged', oldLine: 5, newLine: 6, text: '    "react": "^18.2.0"' },
      { type: 'unchanged', oldLine: 6, newLine: 7, text: '  }' },
      { type: 'unchanged', oldLine: 7, newLine: 8, text: '}' },
    ];
  }
  if (filename.endsWith('.md')) {
    return [
      { type: 'unchanged', oldLine: 1, newLine: 1, text: '# Cognitive Stream Explorer' },
      { type: 'unchanged', oldLine: 2, newLine: 2, text: '' },
      { type: 'removed', oldLine: 3, text: 'A simple file explorer.' },
      { type: 'added', newLine: 3, text: 'A next-generation file explorer with multi-tab, drag & drop, and integrated terminal.' },
      { type: 'unchanged', oldLine: 4, newLine: 4, text: '' },
      { type: 'added', newLine: 5, text: '## Features' },
      { type: 'added', newLine: 6, text: '- Multi-tab navigation' },
      { type: 'added', newLine: 7, text: '- Integrated PowerShell terminal' },
    ];
  }
  return [
    { type: 'unchanged', oldLine: 1, newLine: 1, text: 'export function explorer() {' },
    { type: 'removed', oldLine: 2, text: '  return "v1";' },
    { type: 'added', newLine: 2, text: '  return "v2 — full rewrite";' },
    { type: 'unchanged', oldLine: 3, newLine: 3, text: '}' },
  ];
};

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  filename: string;
  branch: string;
  baseBranch?: string;
}

export function DiffView({ open, onOpenChange, filename, branch, baseBranch = 'main' }: Props) {
  const diff = mockDiff(filename);
  const added = diff.filter((d) => d.type === 'added').length;
  const removed = diff.filter((d) => d.type === 'removed').length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl glass-menu border-border/40 p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border/30 shrink-0">
          <SheetTitle className="text-[13px] font-normal flex items-center gap-2 font-mono">
            <ArrowLeftRight size={13} className="text-primary" />
            {filename}
            <span className="text-muted-foreground font-light">·</span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <GitBranch size={10} /> {baseBranch} → {branch}
            </span>
            <span className="ml-auto flex items-center gap-2 text-[11px]">
              <span className="text-emerald-400 font-mono">+{added}</span>
              <span className="text-red-400 font-mono">−{removed}</span>
            </span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-auto font-mono text-[11px]">
          <table className="w-full border-collapse">
            <tbody>
              {diff.map((d, i) => (
                <tr
                  key={i}
                  className={cn(
                    d.type === 'added' && 'bg-emerald-500/10',
                    d.type === 'removed' && 'bg-red-500/10'
                  )}
                >
                  <td className="w-10 text-right pr-2 text-muted-foreground/50 select-none border-r border-border/20">
                    {d.oldLine ?? ''}
                  </td>
                  <td className="w-10 text-right pr-2 text-muted-foreground/50 select-none border-r border-border/20">
                    {d.newLine ?? ''}
                  </td>
                  <td className="w-5 text-center text-muted-foreground/60 select-none">
                    {d.type === 'added' ? '+' : d.type === 'removed' ? '−' : ' '}
                  </td>
                  <td className="px-2 py-0.5 whitespace-pre allow-select">{d.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  );
}
