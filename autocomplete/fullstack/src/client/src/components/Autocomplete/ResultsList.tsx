/**
 * ResultsList — the popup containing autocomplete suggestions.
 *
 * ACCESSIBILITY:
 * - role="listbox" marks this as a list of selectable options
 * - Each child has role="option"
 * - aria-live="polite" announces new results to screen readers
 *   without interrupting what they're currently reading
 *
 * UX STATES:
 * The component handles 4 states: loading, error, empty, results.
 * Showing appropriate feedback for each state is critical for
 * good user experience (see frontend.md "Handle different states").
 */

import React from 'react';
import { ResultItem } from './ResultItem';
import type { SearchResult, AutocompleteStatus } from '../../types';

interface ResultsListProps {
  results: SearchResult[];
  status: AutocompleteStatus;
  error: string | null;
  isOpen: boolean;
  selectedIndex: number;
  listboxId: string;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}

export function ResultsList({
  results,
  status,
  error,
  isOpen,
  selectedIndex,
  listboxId,
  onSelect,
  onHover,
}: ResultsListProps) {
  if (!isOpen) return null;

  return (
    <div className="autocomplete-results" aria-live="polite">
      {status === 'loading' && (
        <div className="autocomplete-status">Searching...</div>
      )}

      {status === 'error' && (
        <div className="autocomplete-status autocomplete-error">
          Error: {error}
        </div>
      )}

      {status === 'success' && results.length === 0 && (
        <div className="autocomplete-status">No results found</div>
      )}

      {results.length > 0 && (
        <ul id={listboxId} role="listbox" className="autocomplete-list">
          {results.map((result, index) => (
            <ResultItem
              key={result.id}
              result={result}
              isSelected={index === selectedIndex}
              index={index}
              id={`${listboxId}-option-${index}`}
              onSelect={onSelect}
              onHover={onHover}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
