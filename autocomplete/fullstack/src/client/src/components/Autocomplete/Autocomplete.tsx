/**
 * Autocomplete Component — ties together input, results, and the controller hook.
 *
 * ARCHITECTURE (from frontend.md):
 *
 *   ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
 *   │ SearchInput  │────▶│  Controller   │────▶│ ResultsList  │
 *   │ (Input UI)   │     │ (useAutocomp.)│     │ (Results UI) │
 *   └─────────────┘     └──────┬───────┘     └─────────────┘
 *                              │
 *                       ┌──────▼───────┐
 *                       │    Cache     │
 *                       │(ClientCache) │
 *                       └─────────────┘
 *
 * KEYBOARD NAVIGATION:
 * - ArrowDown/ArrowUp: Navigate through results (wraps around)
 * - Enter: Select the highlighted result
 * - Escape: Close the results popup
 *
 * These keyboard interactions follow the WAI-ARIA Combobox pattern
 * (see frontend.md "Keyboard interaction" section).
 */

import React, { useCallback, useRef, useId } from 'react';
import { useAutocomplete } from '../../hooks/useAutocomplete';
import { SearchInput } from './SearchInput';
import { ResultsList } from './ResultsList';
import type { SearchResult } from '../../types';
import './autocomplete.css';

interface AutocompleteProps {
  onSelect?: (result: SearchResult) => void;
  debounceMs?: number;
  limit?: number;
  minQueryLength?: number;
}

export function Autocomplete({
  onSelect,
  debounceMs = 300,
  limit = 10,
  minQueryLength = 1,
}: AutocompleteProps) {
  const listboxId = useId() + 'listbox';

  const {
    query,
    setQuery,
    results,
    status,
    error,
    isOpen,
    setIsOpen,
    selectedIndex,
    setSelectedIndex,
    cacheStats,
  } = useAutocomplete({ debounceMs, limit, minQueryLength });

  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setQuery(result.name);
      setIsOpen(false);
      onSelect?.(result);
    },
    [setQuery, setIsOpen, onSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) {
        // Open dropdown on arrow down even when closed
        if (e.key === 'ArrowDown' && results.length > 0) {
          setIsOpen(true);
          setSelectedIndex(0);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          // Wrap around: after last item, go back to first
          setSelectedIndex((selectedIndex + 1) % results.length);
          break;

        case 'ArrowUp':
          e.preventDefault();
          // Wrap around: before first item, go to last
          setSelectedIndex((selectedIndex - 1 + results.length) % results.length);
          break;

        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            handleSelect(results[selectedIndex]);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    },
    [isOpen, results, selectedIndex, setSelectedIndex, setIsOpen, handleSelect],
  );

  const handleFocus = useCallback(() => {
    if (results.length > 0) {
      setIsOpen(true);
    }
  }, [results, setIsOpen]);

  const handleBlur = useCallback(() => {
    // Small delay to allow click events on results to fire first
    setTimeout(() => setIsOpen(false), 150);
  }, [setIsOpen]);

  const activeDescendantId =
    selectedIndex >= 0 ? `${listboxId}-option-${selectedIndex}` : undefined;

  return (
    <div ref={containerRef} className="autocomplete-container">
      <SearchInput
        value={query}
        onChange={setQuery}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        isOpen={isOpen}
        activeDescendantId={activeDescendantId}
        listboxId={listboxId}
      />

      <ResultsList
        results={results}
        status={status}
        error={error}
        isOpen={isOpen}
        selectedIndex={selectedIndex}
        listboxId={listboxId}
        onSelect={handleSelect}
        onHover={setSelectedIndex}
      />

      {/* Debug panel — shows cache stats and timing info */}
      <div className="autocomplete-debug">
        <span>Cache: {cacheStats.cachedQueries} queries, {cacheStats.uniqueResults} results</span>
        <span>Hit rate: {(cacheStats.hitRate * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
