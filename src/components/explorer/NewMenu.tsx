import { Plus, FolderPlus, FileText, Code, Image as ImageIcon, FileArchive, TerminalSquare, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useSound } from '@/hooks/useSound';

interface Props {
  onNewFolder: () => void;
  onNewFile: (kind: 'txt' | 'docx' | 'xlsx' | 'pptx' | 'code' | 'md') => void;
  onOpenTerminal: () => void;
  label: string;
}

export function NewMenu({ onNewFolder, onNewFile, onOpenTerminal, label }: Props) {
  const { playHover } = useSound();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onMouseEnter={playHover}
          className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--explorer-hover))] font-light"
        >
          <Plus size={13} /> {label} <ChevronRight size={10} className="opacity-50 rotate-90" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="glass-menu text-[12px] min-w-[220px]">
        <DropdownMenuItem onClick={onNewFolder}>
          <FolderPlus size={13} className="mr-2 text-muted-foreground/80" />
          Dossier
          <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono">Ctrl+Maj+N</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onNewFile('txt')}>
          <FileText size={13} className="mr-2 text-muted-foreground/80" />
          Document texte (.txt)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNewFile('md')}>
          <FileText size={13} className="mr-2 text-muted-foreground/80" />
          Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNewFile('docx')}>
          <FileText size={13} className="mr-2 text-muted-foreground/80" />
          Document Word (.docx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNewFile('xlsx')}>
          <FileText size={13} className="mr-2 text-muted-foreground/80" />
          Feuille Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNewFile('pptx')}>
          <FileText size={13} className="mr-2 text-muted-foreground/80" />
          Présentation PowerPoint (.pptx)
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Code size={13} className="mr-2 text-muted-foreground/80" />
            Fichier source
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="glass-menu text-[12px]">
            <DropdownMenuItem onClick={() => onNewFile('code')}>JavaScript (.js)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNewFile('code')}>TypeScript (.ts)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNewFile('code')}>Python (.py)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNewFile('code')}>HTML (.html)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNewFile('code')}>CSS (.css)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNewFile('code')}>JSON (.json)</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenTerminal}>
          <TerminalSquare size={13} className="mr-2 text-muted-foreground/80" />
          Terminal ici
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
