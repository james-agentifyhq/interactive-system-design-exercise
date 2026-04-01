/**
 * OpenRouter LLM Client — raw streaming with cancellation support.
 *
 * Uses the OpenAI SDK pointed at OpenRouter's API (OpenAI-compatible).
 * No LangChain, no Vercel AI SDK. Direct SDK usage with async generator.
 *
 * Cancellation is critical here (unlike traditional autocomplete):
 * - LLM inference is expensive (GPU time)
 * - When the user keeps typing, we must stop generation to free resources
 * - AbortSignal propagates from client → server → stream controller abort
 */

import OpenAI from 'openai';

export interface StreamToken {
  text: string;
  done: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

const DEFAULT_MODEL = 'openrouter/free';

export class OpenRouterClient {
  private client: OpenAI;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey ?? process.env.OPENROUTER_API_KEY,
    });
    this.model = model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  }

  /**
   * Stream a completion, yielding tokens as they arrive.
   *
   * The generator yields { text, done } for each token, and a final
   * { text: '', done: true, usage } when generation completes.
   *
   * Pass an AbortSignal to cancel inference mid-stream.
   */
  async *streamCompletion(
    system: string,
    userMessage: string,
    options: {
      maxTokens: number;
      temperature: number;
      stopSequences?: string[];
    },
    signal?: AbortSignal,
  ): AsyncGenerator<StreamToken> {
    const stream = await this.client.chat.completions.create(
      {
        model: this.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        stream: true,
        stream_options: { include_usage: true },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMessage },
        ],
        stop: options.stopSequences,
      },
      { signal },
    );

    let promptTokens = 0;
    let completionTokens = 0;

    try {
      for await (const chunk of stream) {
        if (signal?.aborted) break;

        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          yield { text: delta.content, done: false };
        }

        // OpenAI streaming sends usage in the final chunk (when stream_options.include_usage is true)
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens;
          completionTokens = chunk.usage.completion_tokens;
        }
      }

      if (!signal?.aborted) {
        yield {
          text: '',
          done: true,
          usage: { promptTokens, completionTokens },
        };
      }
    } catch (err) {
      // Re-throw unless it's an abort
      if (signal?.aborted) return;
      throw err;
    }
  }
}
