/**
 * Normalized Client Cache — Option 3 from the system design document.
 *
 * WHY NORMALIZED?
 * The frontend.md discusses three cache approaches:
 *   1. Hash map (query → results array): Simple but duplicates result data
 *   2. Flat list: No duplication but requires client-side filtering (bad for perf)
 *   3. Normalized: Fast lookup + no duplication (this implementation)
 *
 * HOW IT WORKS:
 * We maintain two data structures:
 *   - `results`: Map of result ID → result data (the "database")
 *   - `queryCache`: Map of query string → list of result IDs + metadata
 *
 * When the same result appears for multiple queries (e.g., "Facebook" matches
 * both "fa" and "fac"), the result data is stored ONCE in `results`, and both
 * query entries just reference its ID.
 *
 * FRONTEND SYSTEM DESIGN TIP:
 * This is the same pattern used by Redux/normalizr for managing relational
 * data on the frontend. It's directly inspired by database normalization.
 */

import type { SearchResult } from '../types';

interface CacheEntry {
  ids: number[];
  timestamp: number;
  meta: {
    total: number;
    took: number;
  };
}

export class ClientCache {
  /** The "database" — all result objects keyed by ID */
  private results: Map<number, SearchResult> = new Map();
  /** Query string → list of result IDs (the "index") */
  private queryCache: Map<string, CacheEntry> = new Map();
  /** How long cache entries are valid (ms) */
  private ttlMs: number;
  /** Stats for debugging */
  private _hits = 0;
  private _misses = 0;

  constructor(ttlMs: number = 60_000) {
    this.ttlMs = ttlMs;
  }

  /**
   * Look up cached results for a query.
   *
   * Returns the full SearchResult[] if cache hit, or null if miss/expired.
   */
  get(query: string): SearchResult[] | null {
    const entry = this.queryCache.get(query.toLowerCase());

    if (!entry) {
      this._misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.queryCache.delete(query.toLowerCase());
      this._misses++;
      return null;
    }

    // Reconstruct results from IDs (the "join" operation)
    const results: SearchResult[] = [];
    for (const id of entry.ids) {
      const result = this.results.get(id);
      if (result) results.push(result);
    }

    this._hits++;
    return results;
  }

  /**
   * Store results for a query in the cache.
   *
   * Each result is stored individually by ID (normalized),
   * and the query entry just stores the list of IDs.
   */
  set(query: string, results: SearchResult[], meta: { total: number; took: number }): void {
    // Store each result in the normalized "database"
    for (const result of results) {
      this.results.set(result.id, result);
    }

    // Store the query → ID mapping
    this.queryCache.set(query.toLowerCase(), {
      ids: results.map((r) => r.id),
      timestamp: Date.now(),
      meta,
    });
  }

  /** Cache statistics for debugging */
  get stats() {
    const total = this._hits + this._misses;
    return {
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? this._hits / total : 0,
      uniqueResults: this.results.size,
      cachedQueries: this.queryCache.size,
    };
  }

  clear(): void {
    this.results.clear();
    this.queryCache.clear();
    this._hits = 0;
    this._misses = 0;
  }
}
