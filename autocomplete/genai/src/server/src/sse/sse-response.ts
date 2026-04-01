/**
 * Hand-built SSE (Server-Sent Events) response.
 *
 * No Hono SSE helper, no library — raw ReadableStream with data: formatting.
 * This is intentional: the point of this demo is to show the SSE mechanics.
 *
 * SSE format:
 *   data: {"text":"hello","done":false}\n\n
 *   data: {"text":"","done":true}\n\n
 *
 * Each event is a JSON-serialized CompletionChunk prefixed with "data: "
 * and terminated by two newlines.
 */

import type { CompletionChunk, SSEWriter } from '../types.js';

/**
 * Creates an SSE Response by running the handler with an SSEWriter.
 *
 * The handler receives a writer object to emit events and must call
 * writer.close() when done. If the client disconnects (signal aborted),
 * the stream closes automatically.
 */
export function createSSEStream(
  handler: (writer: SSEWriter) => Promise<void>,
  signal?: AbortSignal,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const writer: SSEWriter = {
        writeEvent(data: CompletionChunk) {
          try {
            const line = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(line));
          } catch {
            // Stream already closed — ignore
          }
        },
        close() {
          try {
            controller.close();
          } catch {
            // Already closed — ignore
          }
        },
      };

      // If client disconnects, close the stream
      if (signal) {
        signal.addEventListener('abort', () => writer.close(), { once: true });
      }

      try {
        await handler(writer);
      } catch (err) {
        // If the handler throws (e.g., LLM error), send an error event and close
        if (!signal?.aborted) {
          console.error('SSE handler error:', err);
          writer.writeEvent({
            id: 'error',
            text: '',
            done: true,
            finishReason: 'stop',
          });
          writer.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
