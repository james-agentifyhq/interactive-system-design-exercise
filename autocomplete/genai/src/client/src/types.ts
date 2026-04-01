/** A single chunk from the SSE stream (mirrors server's CompletionChunk). */
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

/** Stats displayed in the StatsPanel. */
export interface CompletionStats {
  totalRequests: number;
  cacheHits: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  lastLatencyMs: number;
  lastCached: boolean;
}
