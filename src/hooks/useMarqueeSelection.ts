import { useEffect, useRef, useState, RefObject } from 'react';

export interface MarqueeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Options {
  containerRef: RefObject<HTMLElement>;
  itemSelector: string; // e.g. '[data-file-id]'
  enabled?: boolean;
  onSelectionChange: (ids: string[], additive: boolean) => void;
  onClear?: () => void;
}

/**
 * Windows-style marquee selection.
 * Returns the current rectangle (in container-local coords) or null when idle.
 * Caller renders the overlay using these coordinates.
 */
export function useMarqueeSelection({ containerRef, itemSelector, enabled = true, onSelectionChange, onClear }: Options): MarqueeRect | null {
  const [rect, setRect] = useState<MarqueeRect | null>(null);
  const startRef = useRef<{ x: number; y: number; additive: boolean } | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      // Only start if the click is on the empty area (the container itself or scroll wrapper),
      // not on a file item or an interactive element.
      const target = e.target as HTMLElement;
      if (target.closest(itemSelector)) return;
      if (target.closest('button, a, input, [data-no-marquee]')) return;

      const bounds = el.getBoundingClientRect();
      const additive = e.ctrlKey || e.metaKey || e.shiftKey;
      startRef.current = {
        x: e.clientX - bounds.left + el.scrollLeft,
        y: e.clientY - bounds.top + el.scrollTop,
        additive,
      };
      draggingRef.current = false;
      if (!additive) onClear?.();
    };

    const onMove = (e: MouseEvent) => {
      const start = startRef.current;
      if (!start) return;
      const bounds = el.getBoundingClientRect();
      const x = e.clientX - bounds.left + el.scrollLeft;
      const y = e.clientY - bounds.top + el.scrollTop;
      const dx = x - start.x;
      const dy = y - start.y;
      // Only activate after a small threshold to differentiate from clicks
      if (!draggingRef.current && Math.hypot(dx, dy) < 4) return;
      draggingRef.current = true;

      const r: MarqueeRect = {
        left: Math.min(start.x, x),
        top: Math.min(start.y, y),
        width: Math.abs(dx),
        height: Math.abs(dy),
      };
      setRect(r);

      // Compute selected ids by intersection
      const items = el.querySelectorAll<HTMLElement>(itemSelector);
      const ids: string[] = [];
      const containerBounds = el.getBoundingClientRect();
      const selLeft = r.left + containerBounds.left - el.scrollLeft;
      const selTop = r.top + containerBounds.top - el.scrollTop;
      const selRight = selLeft + r.width;
      const selBottom = selTop + r.height;
      items.forEach(node => {
        const id = node.dataset.fileId;
        if (!id) return;
        const b = node.getBoundingClientRect();
        if (b.right >= selLeft && b.left <= selRight && b.bottom >= selTop && b.top <= selBottom) {
          ids.push(id);
        }
      });
      onSelectionChange(ids, start.additive);
    };

    const onUp = () => {
      startRef.current = null;
      draggingRef.current = false;
      setRect(null);
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [containerRef, itemSelector, enabled, onSelectionChange, onClear]);

  return rect;
}
