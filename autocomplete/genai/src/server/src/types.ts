/**
 * Shared type definitions — maps directly to the data model in genai.md.
 */

/** What the client sends to request a completion. */
export interface CompletionRequest {
  context: {
    textBefore: string;
    textAfter: string;
  };
  options?: {
    maxTokens?: number;
    temperature?: number;
  };
}

/** A single chunk in the SSE stream. */
export interface CompletionChunk {
  id: string;
  text: string;
  done: boolean;
  finishReason?: 'stop' | 'length' | 'cancelled';
  cached?: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
  };
}

/** Writer interface for SSE streaming. */
export interface SSEWriter {
  writeEvent(data: CompletionChunk): void;
  close(): void;
}
