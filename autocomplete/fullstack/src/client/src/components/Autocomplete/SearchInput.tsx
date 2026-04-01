/**
 * SearchInput — the input field UI component.
 *
 * ACCESSIBILITY:
 * This component implements the WAI-ARIA Combobox pattern:
 * - role="combobox" tells screen readers this is an autocomplete input
 * - aria-expanded indicates whether the dropdown is visible
 * - aria-activedescendant points to the currently highlighted option
 * - aria-autocomplete="list" indicates suggestions appear in a list
 * - aria-controls links the input to its results listbox
 *
 * See the comparison table in frontend.md for how Google, Facebook,
 * and X implement these attributes differently.
 */

import React from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isOpen: boolean;
  activeDescendantId?: string;
  listboxId: string;
}

export function SearchInput({
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  isOpen,
  activeDescendantId,
  listboxId,
}: SearchInputProps) {
  return (
    <input
      type="text"
      role="combobox"
      aria-label="Search"
      aria-expanded={isOpen}
      aria-controls={listboxId}
      aria-activedescendant={activeDescendantId}
      aria-autocomplete="list"
      aria-haspopup="listbox"
      autoComplete="off"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      placeholder="Search cities, companies, tech, people..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className="autocomplete-input"
    />
  );
}
