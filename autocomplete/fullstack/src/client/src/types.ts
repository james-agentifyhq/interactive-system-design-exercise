/**
 * Shared type definitions for the autocomplete client.
 *
 * These types mirror the server's response format and are used
 * throughout the frontend for type safety.
 */

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

export type AutocompleteStatus = 'idle' | 'loading' | 'success' | 'error';
