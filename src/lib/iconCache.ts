// Icon cache: preloads & memoizes icon URLs to avoid flicker when navigating folders.

const cache = new Map<string, 'loaded' | 'error' | 'loading'>();
const listeners = new Map<string, Set<() => void>>();

function notify(url: string) {
  listeners.get(url)?.forEach(fn => fn());
}

export function preloadIcon(url: string): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  if (cache.get(url) === 'loaded') return Promise.resolve(true);
  if (cache.get(url) === 'error') return Promise.resolve(false);
  if (cache.get(url) === 'loading') {
    return new Promise(res => {
      const set = listeners.get(url) || new Set();
      const fn = () => res(cache.get(url) === 'loaded');
      set.add(fn);
      listeners.set(url, set);
    });
  }
  cache.set(url, 'loading');
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { cache.set(url, 'loaded'); notify(url); res(true); };
    img.onerror = () => { cache.set(url, 'error'); notify(url); res(false); };
    img.src = url;
  });
}

export function preloadIcons(urls: (string | undefined)[]) {
  urls.forEach(u => { if (u) preloadIcon(u); });
}

export function isIconReady(url: string): boolean {
  return cache.get(url) === 'loaded';
}

export function isIconErrored(url: string): boolean {
  return cache.get(url) === 'error';
}
