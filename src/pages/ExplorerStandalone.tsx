import { useEffect } from 'react';
import { FileExplorer } from '@/components/explorer';

export default function ExplorerStandalone() {
  useEffect(() => {
    document.title = 'Cognitive Stream — Explorer';
  }, []);

  const params = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.search);
  const initialFolderId = params.get('folderId') || 'root';

  return (
    <FileExplorer
      embeddedMode="standalone"
      showWindowChrome
      className="h-screen"
      initialFolderId={initialFolderId}
    />
  );
}
