import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  command: string;
  reason: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDangerousDialog({ open, command, reason, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-300">
            <AlertTriangle size={18} /> Commande sensible
          </DialogTitle>
          <DialogDescription>
            L'agent souhaite exécuter une commande potentiellement destructive. Confirme si tu es sûr.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Raison</div>
          <div className="text-[12px] text-amber-200/90">{reason || 'Impact étendu'}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3">Commande</div>
          <pre className="text-[11.5px] font-mono bg-black/40 border border-border/40 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
{command}
          </pre>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onCancel}>Annuler</Button>
          <Button variant="destructive" onClick={onConfirm}>Exécuter quand même</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
