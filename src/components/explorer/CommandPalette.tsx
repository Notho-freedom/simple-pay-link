import { useEffect, useState, useMemo } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { fileSystem } from '@/data/mockFileSystem';
import { FileIcon } from './FileIcon';
import { useI18n } from '@/i18n/LanguageContext';
import { Folder, Eye, Languages, Trash2, PanelRight } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (id: string) => void;
  onTogglePreview: () => void;
  onToggleHidden: () => void;
  onToggleLanguage: () => void;
}

export function CommandPalette({ open, onOpenChange, onNavigate, onTogglePreview, onToggleHidden, onToggleLanguage }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const folders = useMemo(
    () => Object.values(fileSystem).filter(f => f.type === 'folder' && !f.isHidden).slice(0, 200),
    []
  );

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl glass-menu border-border/40 overflow-hidden">
        <Command shouldFilter className="bg-transparent">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={t('cmd.placeholder')}
            className="text-[13px] font-light"
          />
          <CommandList className="max-h-80">
            <CommandEmpty className="text-[12px] py-6 text-muted-foreground">{t('cmd.noResult')}</CommandEmpty>

            <CommandGroup heading={t('cmd.actions')}>
              <CommandItem onSelect={() => { onTogglePreview(); onOpenChange(false); }}>
                <PanelRight size={14} className="mr-2 text-muted-foreground" /> {t('toolbar.previewPane')}
              </CommandItem>
              <CommandItem onSelect={() => { onToggleHidden(); onOpenChange(false); }}>
                <Eye size={14} className="mr-2 text-muted-foreground" /> {t('cmd.toggleHidden')}
              </CommandItem>
              <CommandItem onSelect={() => { onToggleLanguage(); onOpenChange(false); }}>
                <Languages size={14} className="mr-2 text-muted-foreground" /> {t('cmd.toggleLang')}
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading={t('cmd.folders')}>
              {folders.map(f => (
                <CommandItem
                  key={f.id}
                  value={`${f.name} ${f.id}`}
                  onSelect={() => { onNavigate(f.id); onOpenChange(false); }}
                >
                  <span className="mr-2"><FileIcon type="folder" name={f.name} size={14} /></span>
                  <span className="truncate">{f.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono">{f.id}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
