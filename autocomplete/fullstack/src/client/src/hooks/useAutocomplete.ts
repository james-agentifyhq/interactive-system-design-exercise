/**
 * useAutocomplete Hook — the "Controller" from the system design architecture.
 *
 * This is the "brain" of the autocomplete component. It orchestrates:
 * 1. Debouncing user input
 * 2. Checking the client-side cache
 * 3. Fetching from the API on cache miss
 * 4. Handling race conditions (stale requests)
 * 5. Managing loading/error/success states
 *
 * RACE CONDITION HANDLING:
 * The frontend.md discusses two approaches:
 *   1. Timestamps to identify latest request
 *   2. Store results by query key, display only current query's results
 *
 * We use approach 2 (via the normalized cache) PLUS AbortController to
 * cancel stale in-flight requests. This means:
 * - Each new search aborts the previous pending request
 * - Results are stored in cache by query key
 * - We only display results matching the current input value
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { ClientCache } from '../cache/client-cache';
import { searchApi } from '../utils/api';
import type { SearchResult, AutocompleteStatus } from '../types';

interface UseAutocompleteOptions {
  debounceMs?: number;
  limit?: number;
  minQueryLength?: number;
  cacheTtlMs?: number;
}

interface UseAutocompleteReturn {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  status: AutocompleteStatus;
  error: string | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
  cacheStats: ClientCache['stats'];
}

export function useAutocomplete(options: UseAutocompleteOptions = {}): UseAutocompleteReturn {
  const {
    debounceMs = 300,
    limit = 10,
    minQueryLength = 1,
    cacheTtlMs = 60_000,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<AutocompleteStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Persist cache across re-renders (but not across component mounts)
  const cacheRef = useRef(new ClientCache(cacheTtlMs));

  // AbortController for canceling stale requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce the query so we don't fire API requests on every keystroke
  const debouncedQuery = useDebounce(query, debounceMs);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  // Main search effect — runs when the debounced query changes
  useEffect(() => {
    const trimmedQuery = debouncedQuery.trim();

    // Don't search if query is too short
    if (trimmedQuery.length < minQueryLength) {
      setResults([]);
      setStatus('idle');
      setError(null);
      setIsOpen(false);
      return;
    }

    // Check cache first
    const cached = cacheRef.current.get(trimmedQuery);
    if (cached) {
      setResults(cached);
      setStatus('success');
      setError(null);
      setIsOpen(true);
      return;
    }

    // Cancel any previous in-flight request (race condition prevention)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus('loading');
    setError(null);

    searchApi(trimmedQuery, limit, controller.signal)
      .then((response) => {
        // Store in cache for future lookups
        cacheRef.current.set(trimmedQuery, response.results, response.meta);

        setResults(response.results);
        setStatus('success');
        setIsOpen(true);
      })
      .catch((err) => {
        // Don't treat aborted requests as errors
        if (err.name === 'AbortError') return;

        setError(err.message);
        setStatus('error');
      });

    // Cleanup: abort request if component unmounts or query changes
    return () => {
      controller.abort();
    };
  }, [debouncedQuery, limit, minQueryLength]);

  const getCacheStats = useCallback(() => cacheRef.current.stats, []);

  return {
    query,
    setQuery,
    results,
    status,
    error,
    isOpen,
    setIsOpen,
    selectedIndex,
    setSelectedIndex,
    get cacheStats() {
      return getCacheStats();
    },
  };
}
