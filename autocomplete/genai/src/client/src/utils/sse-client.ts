/**
 * Hand-built SSE client using fetch + ReadableStream.
 *
 * No EventSource (it's GET-only; we need POST with JSON body).
 * No library. We parse "data: " lines from the stream manually.
 *
 * This async generator yields CompletionChunk objects as they arrive,
 * making it easy to consume with for-await-of.
 */

import type { CompletionChunk } from '../types';

/**
 * Stream a completion from the server via SSE.
 *
 * Usage:
 *   for await (const chunk of streamCompletion('Hello, ', '', signal)) {
 *     console.log(chunk.text); // token by token
 *     if (chunk.done) break;
 *   }
 */
export async function* streamCompletion(
  textBefore: string,
  textAfter: string,
  signal?: AbortSignal,
): AsyncGenerator<CompletionChunk> {
  const response = await fetch('/api/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: { textBefore, textAfter },
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newlines.
      // Each event looks like: "data: {...json...}\n\n"
      const parts = buffer.split('\n\n');
      // Keep the last (potentially incomplete) part in the buffer
      buffer = parts.pop() || '';

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        // Extract the "data: " line (SSE can have other fields like "event:", "id:", etc.)
        const dataLine = trimmed
          .split('\n')
          .find((line) => line.startsWith('data: '));

        if (dataLine) {
          const json = dataLine.slice(6); // Remove "data: " prefix
          const chunk: CompletionChunk = JSON.parse(json);
          yield chunk;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
