import { useEffect, useSyncExternalStore, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  IconDescriptor,
  descriptorKey,
  getBaseIcon,
  getResolvedIcon,
  requestUpgrade,
  subscribe,
} from '@/lib/iconResolver';

interface DescriptorProps {
  descriptor: IconDescriptor;
  size?: number;
  alt?: string;
  className?: string;
}

interface LegacyProps {
  src: string;
  fallbackSrc?: string | string[];
  size?: number;
  alt?: string;
  className?: string;
  fallbackEmoji?: string;
}

type Props = DescriptorProps | LegacyProps;

const EMOJI_RE = /\p{Extended_Pictographic}/u;
function safeGlyph(g?: string): string {
  if (!g) return '📎';
  if (g.length > 4 || !EMOJI_RE.test(g)) return '📎';
  return g;
}

/**
 * HD icon with two modes:
 * 1. Descriptor (preferred): renders the inline SVG immediately, then upgrades
 *    in the background via the icon resolver. Never blocks, never empty.
 * 2. Legacy src/fallbackSrc/fallbackEmoji cascade for callers outside the explorer.
 */
export function HDIcon(props: Props) {
  if ('descriptor' in props) return <DescriptorIcon {...props} />;
  return <LegacyIcon {...props} />;
}

function DescriptorIcon({ descriptor, size = 24, alt = '', className = '' }: DescriptorProps) {
  const key = descriptorKey(descriptor);
  const base = getBaseIcon(descriptor);
  const url = useSyncExternalStore(
    (cb) => subscribe(key, cb),
    () => getResolvedIcon(key) || base,
    () => base,
  );
  useEffect(() => { requestUpgrade(descriptor); }, [key]);
  return (
    <img
      src={url}
      alt={alt}
      draggable={false}
      className={cn('shrink-0 select-none object-contain', className)}
      style={{ width: size, height: size }}
      onError={(e) => {
        // Defensive: if the upgraded URL somehow fails at <img> time, revert to base.
        const target = e.currentTarget as HTMLImageElement;
        if (target.src !== base) target.src = base;
      }}
    />
  );
}

function LegacyIcon({ src, fallbackSrc, size = 24, alt = '', className = '', fallbackEmoji }: LegacyProps) {
  const sources = [src, ...(Array.isArray(fallbackSrc) ? fallbackSrc : fallbackSrc ? [fallbackSrc] : [])].filter(Boolean) as string[];
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [src]);
  if (idx >= sources.length) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={cn('shrink-0 leading-none select-none inline-flex items-center justify-center', className)}
        style={{ fontSize: `${Math.round(size * 0.85)}px`, lineHeight: 1, width: size, height: size }}
      >
        {safeGlyph(fallbackEmoji)}
      </span>
    );
  }
  return (
    <img
      key={sources[idx]}
      src={sources[idx]}
      alt={alt}
      draggable={false}
      onError={() => setIdx(i => i + 1)}
      className={cn('shrink-0 select-none object-contain', className)}
      style={{ width: size, height: size }}
    />
  );
}
