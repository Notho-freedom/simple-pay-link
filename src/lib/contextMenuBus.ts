// Lightweight global bus so non-grid components can open the explorer's
// shared context menu without prop-drilling. ExplorerTab listens.
import { CtxContext } from '@/components/explorer/contextMenuConfig';

export interface OpenCtxDetail {
  x: number;
  y: number;
  ctx: CtxContext;
  // optional handler invoked when an action is fired; if absent, the
  // tab's default dispatcher handles it.
  onAction?: (id: string, ctx: CtxContext) => void;
}

export const CTX_EVENT = 'explorer-open-ctx';

export function openContextMenu(e: React.MouseEvent | MouseEvent, ctx: CtxContext, onAction?: OpenCtxDetail['onAction']) {
  e.preventDefault();
  (e as any).stopPropagation?.();
  const detail: OpenCtxDetail = { x: (e as any).clientX, y: (e as any).clientY, ctx, onAction };
  window.dispatchEvent(new CustomEvent(CTX_EVENT, { detail }));
}
