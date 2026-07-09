import { useState, useCallback } from 'react';

const MIME = 'application/x-explorer-ids';

export function useDragDropTarget(onDrop: (ids: string[], copy: boolean) => void) {
  const [over, setOver] = useState(false);
  const handlers = {
    onDragOver: (e: React.DragEvent) => {
      const dataTransfer = e.dataTransfer;
      if (!dataTransfer) return;
      const types = Array.from(dataTransfer.types || []);
      if (!types.includes(MIME)) return;
      e.preventDefault();
      e.stopPropagation();
      dataTransfer.dropEffect = e.ctrlKey || e.metaKey ? 'copy' : 'move';
      if (!over) setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOver(false);
      const dataTransfer = e.dataTransfer;
      if (!dataTransfer) return;
      const raw = dataTransfer.getData(MIME);
      if (!raw) return;
      try {
        const ids = JSON.parse(raw) as string[];
        if (Array.isArray(ids) && ids.length) onDrop(ids, e.ctrlKey || e.metaKey);
      } catch {}
    },
  };
  return { over, handlers };
}


export function makeDragHandlers(ids: string[]) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      const dataTransfer = e.dataTransfer;
      if (!dataTransfer) return;
      e.stopPropagation();
      dataTransfer.effectAllowed = 'copyMove';
      dataTransfer.setData(MIME, JSON.stringify(ids));
    },
  };
}

export const EXPLORER_DND_MIME = MIME;
