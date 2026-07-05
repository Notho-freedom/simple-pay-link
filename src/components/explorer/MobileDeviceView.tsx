import { Smartphone, WifiOff } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface Props {
  onNavigate: (id: string) => void;
}

export function MobileDeviceView(_: Props) {
  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <EmptyState
        icon={<WifiOff size={22} />}
        title="Aucun appareil mobile detecte"
        description="La detection MTP/Android n est pas encore branchee cote serveur. Cette vue reste vide au lieu d afficher des donnees fictives."
        actions={<Smartphone size={18} className="text-muted-foreground/40" />}
      />
    </div>
  );
}
