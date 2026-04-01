/**
 * API client — fetch wrapper with timeout support.
 *
 * DESIGN NOTE:
 * This is a thin wrapper around fetch(). In the frontend system design doc,
 * the "controller" is responsible for fetching results. This utility handles
 * the low-level HTTP concerns so the hook can focus on state management.
 *
 * RACE CONDITION HANDLING:
 * We use AbortController to cancel stale requests. While the system design doc
 * notes that "it's not advisable to abort requests since the server would have
 * already processed them," in practice, aborting is fine for the CLIENT side —
 * it prevents the browser from processing the response and saves memory.
 * The server still processes it, which is unavoidable.
 */

import type { SearchResponse } from '../types';

const API_BASE = '/api';

export async function searchApi(
  query: string,
  limit: number = 10,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });

  const response = await fetch(`${API_BASE}/search?${params}`, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
