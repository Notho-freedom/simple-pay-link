import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface Props { open: boolean; onOpenChange: (v: boolean) => void }

const GROUPS: Array<{ title: string; items: Array<[string, string]> }> = [
  { title: 'Navigation', items: [
    ['Alt + ←', 'Précédent'],
    ['Alt + →', 'Suivant'],
    ['Backspace', 'Dossier parent'],
    ['Ctrl + L', 'Éditer le chemin'],
    ['Ctrl + T', 'Nouvel onglet'],
    ['Ctrl + W', 'Fermer l\'onglet'],
    ['Enter', 'Ouvrir la sélection'],
    ['Échap', 'Effacer la sélection'],
  ]},
  { title: 'Sélection & édition', items: [
    ['Ctrl + A', 'Tout sélectionner'],
    ['Ctrl + C / X / V', 'Copier / Couper / Coller'],
    ['F2', 'Renommer'],
    ['Suppr', 'Supprimer'],
    ['Ctrl + Z', 'Annuler (bientôt)'],
  ]},
  { title: 'Vue & outils', items: [
    ['F5', 'Actualiser'],
    ['Ctrl + F', 'Rechercher dans le dossier'],
    ['Ctrl + K', 'Palette de commandes'],
    ['Ctrl + `', 'Terminal'],
    ['F3', 'Split view'],
    ['F1', 'Cette aide'],
  ]},
];

export function HelpDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-normal flex items-center gap-2"><Keyboard size={14} /> Raccourcis clavier</DialogTitle>
          <DialogDescription className="text-[11px] font-light">Tout ce que vous pouvez faire au clavier dans Cognitive Explorer.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 text-[12px] font-light">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2">{g.title}</h4>
              <div className="space-y-1">
                {g.items.map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between py-1 border-b border-border/10">
                    <span className="text-foreground/90">{desc}</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[hsl(var(--muted))] border border-border/40 text-muted-foreground">{key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
