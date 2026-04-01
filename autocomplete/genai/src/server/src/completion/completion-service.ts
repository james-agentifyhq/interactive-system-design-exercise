/**
 * Completion Service — the orchestrator (the "brain" of the system).
 *
 * Maps to the "Completion Service" box in the genai.md architecture diagram.
 * Implements the decision flow:
 *   1. Embed context
 *   2. Check semantic cache
 *   3. On hit → stream cached result (instant)
 *   4. On miss → build prompt → stream from LLM → store in cache (fire-and-forget)
 *
 * This is the GenAI equivalent of the fullstack's Searcher class, which also
 * implements cache-aside. The key differences:
 * - Cache lookup is by semantic similarity, not exact key match
 * - Response is streamed (SSE), not returned all at once (JSON)
 * - Cache store is async and fire-and-forget (don't block the response)
 * - Cancellation is critical (stops expensive GPU inference)
 */

import { SemanticCache } from '../cache/semantic-cache.js';
import { OpenRouterClient } from '../llm/openrouter-client.js';
import { buildPrompt, DEFAULT_OPTIONS } from '../llm/prompt-builder.js';
import type { CompletionRequest, SSEWriter } from '../types.js';

export class CompletionService {
  private cache: SemanticCache;
  private llm: OpenRouterClient;

  // Stats
  private _totalRequests = 0;
  private _cacheHits = 0;
  private _totalPromptTokens = 0;
  private _totalCompletionTokens = 0;

  constructor(cache: SemanticCache, llm: OpenRouterClient) {
    this.cache = cache;
    this.llm = llm;
  }

  /**
   * Handle a completion request: check cache, call LLM if needed, stream results.
   */
  async complete(
    request: CompletionRequest,
    writer: SSEWriter,
    signal?: AbortSignal,
  ): Promise<void> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    this._totalRequests++;

    const { textBefore, textAfter } = request.context;

    // 1. Check semantic cache
    const cached = await this.cache.lookup(textBefore);
    if (cached) {
      this._cacheHits++;
      // Cache hit: send the full completion in one event (instant)
      writer.writeEvent({
        id: requestId,
        text: cached.completion,
        done: false,
        cached: true,
      });
      writer.writeEvent({
        id: requestId,
        text: '',
        done: true,
        finishReason: 'stop',
        cached: true,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: Date.now() - startTime,
        },
      });
      writer.close();
      return;
    }

    // 2. Build prompt
    const { system, userMessage } = buildPrompt(textBefore, textAfter);

    // 3. Stream from LLM
    const maxTokens = request.options?.maxTokens ?? DEFAULT_OPTIONS.maxTokens;
    const temperature =
      request.options?.temperature ?? DEFAULT_OPTIONS.temperature;

    let fullCompletion = '';

    try {
      for await (const token of this.llm.streamCompletion(
        system,
        userMessage,
        {
          maxTokens,
          temperature,
          stopSequences: [...DEFAULT_OPTIONS.stopSequences],
        },
        signal,
      )) {
        if (signal?.aborted) {
          writer.writeEvent({
            id: requestId,
            text: '',
            done: true,
            finishReason: 'cancelled',
            cached: false,
          });
          writer.close();
          return;
        }

        fullCompletion += token.text;

        writer.writeEvent({
          id: requestId,
          text: token.text,
          done: token.done,
          finishReason: token.done ? 'stop' : undefined,
          cached: false,
          usage: token.usage
            ? {
                promptTokens: token.usage.promptTokens,
                completionTokens: token.usage.completionTokens,
                latencyMs: Date.now() - startTime,
              }
            : undefined,
        });

        if (token.usage) {
          this._totalPromptTokens += token.usage.promptTokens;
          this._totalCompletionTokens += token.usage.completionTokens;
        }
      }
    } catch (err) {
      if (signal?.aborted) {
        writer.writeEvent({
          id: requestId,
          text: '',
          done: true,
          finishReason: 'cancelled',
          cached: false,
        });
      } else {
        console.error('LLM stream error:', err);
        throw err;
      }
    }

    writer.close();

    // 4. Store in semantic cache (fire-and-forget)
    if (fullCompletion.length > 0) {
      this.cache
        .store(textBefore, fullCompletion, process.env.OPENROUTER_MODEL ?? 'openrouter')
        .catch((err) => console.error('Cache store error:', err));
    }
  }

  get stats() {
    return {
      totalRequests: this._totalRequests,
      cacheHits: this._cacheHits,
      cacheHitRate:
        this._totalRequests > 0
          ? this._cacheHits / this._totalRequests
          : 0,
      totalTokens: {
        prompt: this._totalPromptTokens,
        completion: this._totalCompletionTokens,
      },
      cache: this.cache.stats,
    };
  }
}
