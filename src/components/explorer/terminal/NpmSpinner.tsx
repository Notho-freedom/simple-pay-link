import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface Props {
  label?: string;
  className?: string;
  /** ms per frame */
  speed?: number;
}

/**
 * Braille rotating spinner — npm/pnpm install style.
 * Deliberately minimal, no bling.
 */
export function NpmSpinner({ label, className, speed = 80 }: Props) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), speed);
    return () => window.clearInterval(id);
  }, [speed]);
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono text-[11px]', className)}>
      <span className="text-cyan-300 tabular-nums">{FRAMES[frame]}</span>
      {label && <span className="text-muted-foreground/80">{label}</span>}
    </span>
  );
}
