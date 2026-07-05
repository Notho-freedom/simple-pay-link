import { useEffect, useState, useCallback } from 'react';
import { play, playHover, isMuted, setMuted, getVolume, setVolume, subscribe } from '@/lib/sounds';

export function useSound() {
  const [muted, setMutedState] = useState(isMuted());
  const [volume, setVolState] = useState(getVolume());

  useEffect(() => {
    const unsub = subscribe(() => {
      setMutedState(isMuted());
      setVolState(getVolume());
    });
    return () => { unsub(); };
  }, []);

  const toggleMuted = useCallback(() => setMuted(!isMuted()), []);

  return { play, playHover, muted, volume, toggleMuted, setMuted, setVolume };
}
