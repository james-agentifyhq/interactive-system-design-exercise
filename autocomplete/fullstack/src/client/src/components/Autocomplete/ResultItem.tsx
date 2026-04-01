/**
 * ResultItem — renders a single autocomplete suggestion.
 *
 * HIGHLIGHTING:
 * The server returns a `highlight` object with start/end indices
 * indicating which part of the name matched the query. We use this
 * to bold the matched portion, giving the user visual feedback about
 * why this result appeared.
 *
 * Example: query="san", name="San Francisco"
 *   highlight: { start: 0, end: 3 }
 *   Renders: <b>San</b> Francisco
 */

import React from 'react';
import type { SearchResult } from '../../types';

interface ResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  index: number;
  id: string;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  city: '\u{1F3D9}',
  company: '\u{1F3E2}',
  technology: '\u{1F4BB}',
  person: '\u{1F464}',
};

export function ResultItem({ result, isSelected, index, id, onSelect, onHover }: ResultItemProps) {
  const { name, category, highlight } = result;

  // Split the name into highlighted and non-highlighted parts
  const before = name.slice(0, highlight.start);
  const matched = name.slice(highlight.start, highlight.end);
  const after = name.slice(highlight.end);

  return (
    <li
      id={id}
      role="option"
      aria-selected={isSelected}
      className={`autocomplete-result-item ${isSelected ? 'selected' : ''}`}
      onMouseDown={(e) => {
        // mousedown instead of click to fire before input blur
        e.preventDefault();
        onSelect(result);
      }}
      onMouseEnter={() => onHover(index)}
    >
      <span className="result-icon">{CATEGORY_ICONS[category] || ''}</span>
      <span className="result-text">
        {before}
        <strong>{matched}</strong>
        {after}
      </span>
      <span className="result-category">{category}</span>
    </li>
  );
}
