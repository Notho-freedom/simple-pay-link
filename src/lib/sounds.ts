// Instant audio engine using Web Audio API.
// - 0ms latency (decoded AudioBuffers, no <audio> element buffering).
// - Each new play() instantly stops the previous instance of the SAME sound,
//   AND any currently-playing non-hover sound, so rapid UI events feel realtime.
// - hover is throttled (220ms) and isolated so it never interrupts a click.

export type SoundName =
  | 'hover' | 'click' | 'dblclick'
  | 'open' | 'close' | 'delete'
  | 'loading' | 'success' | 'error'
  | 'tab-new' | 'tab-close' | 'paste' | 'cut';

const SOUND_MAP: Record<SoundName, { file: string; vol: number }> = {
  hover:      { file: 'hover.wav',     vol: 0.18 },
  click:      { file: 'click.wav',     vol: 0.45 },
  dblclick:   { file: 'dblclick.wav',  vol: 0.55 },
  open:       { file: 'open.wav',      vol: 0.40 },
  close:      { file: 'close.wav',     vol: 0.45 },
  delete:     { file: 'delete.wav',    vol: 0.55 },
  loading:    { file: 'loading.wav',   vol: 0.35 },
  success:    { file: 'success.wav',   vol: 0.50 },
  error:      { file: 'error.wav',     vol: 0.45 },
  'tab-new':  { file: 'open.wav',      vol: 0.30 },
  'tab-close':{ file: 'tab-close.wav', vol: 0.45 },
  paste:      { file: 'click.wav',     vol: 0.45 },
  cut:        { file: 'click.wav',     vol: 0.40 },
};

const STORE_KEY_MUTED = 'explorer.sound.muted';
const STORE_KEY_VOL = 'explorer.sound.volume';

function readMuted(): boolean {
  try { return localStorage.getItem(STORE_KEY_MUTED) === '1'; } catch { return false; }
}
function readVol(): number {
  try { const v = parseFloat(localStorage.getItem(STORE_KEY_VOL) || '0.7'); return isNaN(v) ? 0.7 : v; }
  catch { return 0.7; }
}

let muted = readMuted();
let masterVolume = readVol();

const subs = new Set<() => void>();
export function subscribe(fn: () => void) { subs.add(fn); return () => subs.delete(fn); }
function notify() { subs.forEach(f => f()); }

export function isMuted() { return muted; }
export function getVolume() { return masterVolume; }
export function setMuted(b: boolean) {
  muted = b;
  try { localStorage.setItem(STORE_KEY_MUTED, b ? '1' : '0'); } catch { /* storage unavailable */ }
  notify();
}
export function setVolume(v: number) {
  masterVolume = Math.max(0, Math.min(1, v));
  try { localStorage.setItem(STORE_KEY_VOL, String(masterVolume)); } catch { /* storage unavailable */ }
  notify();
}

// ── Web Audio engine ──
let ctx: AudioContext | null = null;
const buffers = new Map<SoundName, AudioBuffer>();
const loading = new Map<SoundName, Promise<AudioBuffer | null>>();

// Track the currently-active source per name + the last "interactive" source globally
// so a new event instantly cuts whatever was playing.
const activeByName = new Map<SoundName, AudioBufferSourceNode>();
let lastInteractive: AudioBufferSourceNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  try {
    const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const Ctor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch { return null; }
}

async function loadBuffer(name: SoundName): Promise<AudioBuffer | null> {
  if (buffers.has(name)) return buffers.get(name)!;
  if (loading.has(name)) return loading.get(name)!;
  const c = getCtx();
  if (!c) return null;
  const cfg = SOUND_MAP[name];
  const p = (async () => {
    try {
      const base = typeof document !== 'undefined' ? document.baseURI : window.location.href;
      const src = new URL(`sounds/${cfg.file}`, base).href;
      const res = await fetch(src);
      const arr = await res.arrayBuffer();
      const buf = await c.decodeAudioData(arr);
      buffers.set(name, buf);
      return buf;
    } catch { return null; }
  })();
  loading.set(name, p);
  return p;
}

function stopSource(src: AudioBufferSourceNode | null) {
  if (!src) return;
  try { src.onended = null; src.stop(0); src.disconnect(); } catch { /* already stopped */ }
}

function playBuffer(name: SoundName, buf: AudioBuffer) {
  const c = getCtx();
  if (!c) return;
  // Resume context if suspended (autoplay policy)
  if (c.state === 'suspended') { void c.resume(); }

  // Instantly cut previous instance of same sound
  stopSource(activeByName.get(name) || null);
  // Hover never interrupts other sounds, but other sounds DO interrupt the last interactive
  if (name !== 'hover') {
    stopSource(lastInteractive);
    lastInteractive = null;
  }

  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  gain.gain.value = SOUND_MAP[name].vol * masterVolume;
  src.connect(gain).connect(c.destination);
  src.onended = () => {
    if (activeByName.get(name) === src) activeByName.delete(name);
    if (lastInteractive === src) lastInteractive = null;
    try { src.disconnect(); gain.disconnect(); } catch { /* already disconnected */ }
  };
  activeByName.set(name, src);
  if (name !== 'hover') lastInteractive = src;
  try { src.start(0); } catch { /* source already started or context closed */ }
}

// Resume AudioContext on first user gesture (autoplay policy) — but DO NOT
// fetch/decode every sound here. Decoding ~14 MB of WAV on the first click
// blocked the Electron renderer and could trigger a full "black window" repaint.
// Sounds are now decoded lazily on first use, with a tiny idle prewarm for
// the two most common ones.
let resumed = false;
function resumeOnce() {
  if (resumed) return;
  resumed = true;
  getCtx()?.resume?.().catch(() => undefined);
}
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', resumeOnce, { once: true, passive: true });
  window.addEventListener('keydown', resumeOnce, { once: true });
  // Idle prewarm: only the smallest, most-used clicks.
  type RequestIdle = (cb: () => void, opts?: { timeout?: number }) => number;
  const ric = (window as Window & typeof globalThis & { requestIdleCallback?: RequestIdle }).requestIdleCallback;
  const idle = (fn: () => void) => (ric ? ric(fn, { timeout: 4000 }) : setTimeout(fn, 2500));
  idle(() => { void loadBuffer('click'); });
  idle(() => { void loadBuffer('hover'); });
}

export function play(name: SoundName) {
  if (muted || masterVolume === 0) return;
  const buf = buffers.get(name);
  if (buf) { playBuffer(name, buf); return; }
  // Not yet decoded — kick off load and play once ready (best-effort)
  void loadBuffer(name).then(b => { if (b && !muted) playBuffer(name, b); });
}

let lastHover = 0;
export function playHover() {
  const t = performance.now();
  if (t - lastHover < 220) return;
  lastHover = t;
  play('hover');
}

// ── Synthesized keystroke sound (mechanical key click, Opera GX-like) ──
// Uses filtered noise burst + short pitched blip. Zero-asset, ~1.5kb of code.
const STORE_KEY_KEYSOUND = 'terminal.keysound.enabled';
let keySoundEnabled = (() => {
  try { return localStorage.getItem(STORE_KEY_KEYSOUND) === '1'; } catch { return false; }
})();
export function isKeySoundEnabled() { return keySoundEnabled; }
export function setKeySoundEnabled(b: boolean) {
  keySoundEnabled = b;
  try { localStorage.setItem(STORE_KEY_KEYSOUND, b ? '1' : '0'); } catch { /* ignore */ }
  notify();
}

let lastKey = 0;
export function playKey() {
  if (muted || masterVolume === 0 || !keySoundEnabled) return;
  const now = performance.now();
  if (now - lastKey < 18) return; // rate-limit for very fast typers
  lastKey = now;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') { void c.resume(); }
  const t0 = c.currentTime;

  // Noise burst (the "click")
  const bufferSize = Math.floor(c.sampleRate * 0.03);
  const buf = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800 + Math.random() * 900;
  bp.Q.value = 6;
  const noiseGain = c.createGain();
  const nvol = 0.22 * masterVolume;
  noiseGain.gain.setValueAtTime(nvol, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
  noise.connect(bp).connect(noiseGain).connect(c.destination);
  noise.start(t0);
  noise.stop(t0 + 0.05);

  // Tiny sub thump for the "keycap bottoming out"
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140 + Math.random() * 80, t0);
  osc.frequency.exponentialRampToValueAtTime(60, t0 + 0.05);
  const oGain = c.createGain();
  const ovol = 0.10 * masterVolume;
  oGain.gain.setValueAtTime(ovol, t0);
  oGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
  osc.connect(oGain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.07);
}
