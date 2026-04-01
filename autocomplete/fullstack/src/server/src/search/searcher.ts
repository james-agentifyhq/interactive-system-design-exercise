/**
 * Search Service — the orchestrator that connects Trie, Cache, and Dataset.
 *
 * RESPONSIBILITY:
 * 1. Load dataset and build Trie index on initialization
 * 2. Accept search queries
 * 3. Check cache first (cache-aside pattern)
 * 4. On cache miss: query Trie → rank results → cache → return
 *
 * RANKING STRATEGY:
 * Not all prefix matches are equal. We score results by:
 * - Exact match bonus: query === item name (highest priority)
 * - Prefix position bonus: match at start of name > match at start of a word
 * - Popularity: pre-computed score reflecting real-world importance
 *
 * This mimics how production search engines rank autocomplete suggestions.
 */

import { Trie } from './trie.js';
import { LRUCache } from '../cache/lru-cache.js';

export interface SearchItem {
  id: number;
  name: string;
  category: string;
  popularity: number;
}

export interface SearchResult {
  id: number;
  name: string;
  category: string;
  highlight: {
    start: number;
    end: number;
  };
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  meta: {
    total: number;
    took: number;
    cached: boolean;
  };
}

export class Searcher {
  private trie: Trie;
  private items: Map<number, SearchItem>;
  private cache: LRUCache<string, SearchResult[]>;

  constructor(dataset: SearchItem[], cacheCapacity = 1000, cacheTtlMs = 60_000) {
    this.trie = new Trie();
    this.items = new Map();
    this.cache = new LRUCache(cacheCapacity, cacheTtlMs);

    this.buildIndex(dataset);
  }

  /**
   * Build the Trie index from the dataset.
   *
   * We insert each item's name into the Trie. To support matching on
   * individual words (e.g., "fran" matching "San Francisco"), we also
   * insert each word of multi-word names separately.
   */
  private buildIndex(dataset: SearchItem[]): void {
    for (const item of dataset) {
      this.items.set(item.id, item);

      // Insert the full name
      this.trie.insert(item.name, item.id);

      // Also insert individual words for multi-word names.
      // This allows "francisco" to match "San Francisco".
      const words = item.name.split(/\s+/);
      if (words.length > 1) {
        for (const word of words.slice(1)) {
          this.trie.insert(word, item.id);
        }
      }
    }
  }

  /**
   * Search for items matching a prefix query.
   *
   * Implements the cache-aside pattern:
   * 1. Check cache → return immediately if hit
   * 2. Query Trie for matching IDs
   * 3. Look up full item data for each ID
   * 4. Score and rank results
   * 5. Cache the results
   * 6. Return top-N
   */
  search(query: string, limit: number = 10): SearchResponse {
    const startTime = performance.now();
    const normalizedQuery = query.toLowerCase().trim();

    // Empty query → return empty results
    if (!normalizedQuery) {
      return {
        query,
        results: [],
        meta: { total: 0, took: 0, cached: false },
      };
    }

    // 1. Check cache
    const cacheKey = `${normalizedQuery}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        query,
        results: cached,
        meta: {
          total: cached.length,
          took: performance.now() - startTime,
          cached: true,
        },
      };
    }

    // 2. Query the Trie
    const matchingIds = this.trie.search(normalizedQuery);

    // 3. Score and rank results
    const scored: SearchResult[] = [];
    for (const id of matchingIds) {
      const item = this.items.get(id);
      if (!item) continue;

      const { score, highlight } = this.scoreItem(item, normalizedQuery);
      scored.push({
        id: item.id,
        name: item.name,
        category: item.category,
        highlight,
        score,
      });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Take top-N
    const results = scored.slice(0, limit);

    // 4. Cache the results
    this.cache.set(cacheKey, results);

    return {
      query,
      results,
      meta: {
        total: matchingIds.size,
        took: performance.now() - startTime,
        cached: false,
      },
    };
  }

  /**
   * Score an item against a query.
   *
   * Scoring formula:
   *   score = exactMatchBonus(100) + prefixStartBonus(50) + wordStartBonus(25) + popularity(0-100)
   *
   * This ensures:
   *   1. Exact matches always appear first
   *   2. Prefix-at-start matches rank higher than mid-word matches
   *   3. Among similar matches, more popular items rank higher
   */
  private scoreItem(
    item: SearchItem,
    query: string,
  ): { score: number; highlight: { start: number; end: number } } {
    const nameLower = item.name.toLowerCase();
    let score = item.popularity; // Base score: popularity (0-100)
    let highlightStart = 0;
    let highlightEnd = query.length;

    // Exact match: query equals the full name
    if (nameLower === query) {
      score += 200;
      highlightEnd = item.name.length;
    }
    // Prefix match: name starts with query
    else if (nameLower.startsWith(query)) {
      score += 100;
    }
    // Word-start match: a word within the name starts with query
    else {
      const words = nameLower.split(/\s+/);
      let charIndex = 0;
      for (const word of words) {
        if (word.startsWith(query)) {
          score += 50;
          highlightStart = charIndex;
          highlightEnd = charIndex + query.length;
          break;
        }
        charIndex += word.length + 1; // +1 for the space
      }
    }

    return { score, highlight: { start: highlightStart, end: highlightEnd } };
  }

  /** Expose cache stats for the API */
  get cacheStats() {
    return this.cache.stats;
  }
}
