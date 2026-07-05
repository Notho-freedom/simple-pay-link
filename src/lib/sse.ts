/**
 * SSE-style POST helper. Not a true EventSource (which is GET-only) — we read the
 * response body as a stream of newline-delimited JSON events. Compatible with
 * the `/api/terminal/stream` endpoint below.
 */
import { apiUrl } from './apiClient';

export interface StreamEvent {
  type: 'data' | 'err' | 'end' | 'start';
  chunk?: string;
  code?: number;
  jobId?: string;
}

export interface StreamHandle {
  jobId: string | null;
  abort: () => void;
  done: Promise<void>;
}

export function openStream(
  path: string,
  body: unknown,
  handlers: { onEvent: (e: StreamEvent) => void; onError?: (err: Error) => void },
): StreamHandle {
  const controller = new AbortController();
  const handle: StreamHandle = {
    jobId: null,
    abort: () => controller.abort(),
    done: (async () => {
      try {
        const res = await fetch(apiUrl(path), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body || {}),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`Stream HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (!line) continue;
            try {
              const ev = JSON.parse(line) as StreamEvent;
              if (ev.jobId) handle.jobId = ev.jobId;
              handlers.onEvent(ev);
            } catch { /* ignore malformed */ }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') handlers.onError?.(err as Error);
      }
    })(),
  };
  return handle;
}
