import { ExplorerTab } from './ExplorerTab';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';

interface Props {
  leftFolderId: string;
  rightFolderId: string;
  onLeftFolderChange: (id: string) => void;
  onRightFolderChange: (id: string) => void;
  onOpenCommandPalette: () => void;
}

export function SplitView({ leftFolderId, rightFolderId, onLeftFolderChange, onRightFolderChange, onOpenCommandPalette }: Props) {
  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
      <ResizablePanel defaultSize={50} minSize={25}>
        <div className="h-full flex flex-col">
          <ExplorerTab
            active
            initialFolderId={leftFolderId}
            onFolderChange={onLeftFolderChange}
            onOpenCommandPalette={onOpenCommandPalette}
          />
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle className="bg-border/40" />
      <ResizablePanel defaultSize={50} minSize={25}>
        <div className="h-full flex flex-col">
          <ExplorerTab
            active
            initialFolderId={rightFolderId}
            onFolderChange={onRightFolderChange}
            onOpenCommandPalette={onOpenCommandPalette}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
