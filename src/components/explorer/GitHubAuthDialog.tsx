import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';
import { HDIcon } from './icons/HDIcon';
import { GitHubAuthCard } from './GitHubAuthCard';

const GH_LOGO = 'https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@latest/icons/github.svg';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: (token: string) => void;
}

export function GitHubAuthDialog({ open, onOpenChange, onAuthenticated }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/30 bg-[hsl(var(--muted))]/30">
          <div className="flex items-center gap-2.5">
            <HDIcon src={GH_LOGO} size={20} alt="GitHub" fallbackEmoji="🐙" />
            <span className="text-[13.5px] font-normal">Connecter un compte GitHub</span>
          </div>
          <a
            href="https://github.com/settings/tokens/new?scopes=repo&description=Cognitive%20Explorer"
            target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-[10.5px] text-muted-foreground hover:text-primary transition-colors"
          >
            Créer un token <ExternalLink size={9} />
          </a>
        </div>
        <div className="p-4">
          <GitHubAuthCard
            onAuthenticated={(token) => {
              onAuthenticated(token);
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
