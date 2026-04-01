/**
 * useCompletion Hook — the GenAI equivalent of useAutocomplete.
 *
 * Same pattern: debounce → abort previous → fetch → update state.
 * Key differences from useAutocomplete:
 * - Consumes an SSE stream (async generator) instead of JSON response
 * - Accumulates suggestion text token-by-token
 * - Exposes accept/dismiss for ghost text interaction
 * - 500ms debounce (vs 300ms) — LLM calls are more expensive
 * - Cancellation stops actual GPU inference (vs just ignoring a cheap response)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { streamCompletion } from '../utils/sse-client';
import type { CompletionStats } from '../types';

type Status = 'idle' | 'waiting' | 'streaming' | 'done' | 'error';

interface UseCompletionOptions {
  debounceMs?: number;
}

interface UseCompletionReturn {
  text: string;
  setText: (t: string) => void;
  suggestion: string;
  status: Status;
  stats: CompletionStats;
  accept: () => void;
  dismiss: () => void;
}

const INITIAL_STATS: CompletionStats = {
  totalRequests: 0,
  cacheHits: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  lastLatencyMs: 0,
  lastCached: false,
};

export function useCompletion(
  options: UseCompletionOptions = {},
): UseCompletionReturn {
  const { debounceMs = 500 } = options;

  const [text, setText] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [stats, setStats] = useState<CompletionStats>(INITIAL_STATS);

  const debouncedText = useDebounce(text, debounceMs);
  const abortRef = useRef<AbortController | null>(null);
  // Track which debounced text triggered the current suggestion
  const activeTextRef = useRef<string>('');

  useEffect(() => {
    const trimmed = debouncedText.trim();

    // Don't trigger on empty or very short text
    if (trimmed.length < 5) {
      setSuggestion('');
      setStatus('idle');
      return;
    }

    // Cancel previous stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    activeTextRef.current = debouncedText;

    setSuggestion('');
    setStatus('streaming');

    (async () => {
      try {
        for await (const chunk of streamCompletion(
          debouncedText,
          '',
          controller.signal,
        )) {
          // If text changed since we started, don't update
          if (activeTextRef.current !== debouncedText) break;

          if (chunk.done) {
            setStatus('done');
            setStats((prev) => ({
              totalRequests: prev.totalRequests + 1,
              cacheHits: prev.cacheHits + (chunk.cached ? 1 : 0),
              totalPromptTokens:
                prev.totalPromptTokens + (chunk.usage?.promptTokens ?? 0),
              totalCompletionTokens:
                prev.totalCompletionTokens +
                (chunk.usage?.completionTokens ?? 0),
              lastLatencyMs: chunk.usage?.latencyMs ?? 0,
              lastCached: chunk.cached ?? false,
            }));
          } else {
            setSuggestion((prev) => prev + chunk.text);
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('Completion error:', err);
        setStatus('error');
      }
    })();

    return () => controller.abort();
  }, [debouncedText]);

  // Accept: append suggestion to text
  const accept = useCallback(() => {
    if (!suggestion) return;
    setText((prev) => prev + suggestion);
    setSuggestion('');
    setStatus('idle');
  }, [suggestion]);

  // Dismiss: clear suggestion
  const dismiss = useCallback(() => {
    setSuggestion('');
    setStatus('idle');
  }, []);

  return { text, setText, suggestion, status, stats, accept, dismiss };
}
