# Autocomplete Client

React frontend demonstrating the component architecture, caching strategy, and accessibility patterns discussed in `frontend.md`.

## Running

```bash
pnpm install
pnpm dev          # Vite dev server on port 5173
pnpm build        # production build
```

The dev server proxies `/api/*` requests to `http://localhost:3001` (the backend).

## Project Structure

```
src/
├── main.tsx                         Entry point
├── App.tsx                          Demo page with selected item display
├── types.ts                         Shared TypeScript types
├── components/
│   └── Autocomplete/
│       ├── Autocomplete.tsx         Controller — ties input, results, and hook together
│       ├── SearchInput.tsx          Input with full ARIA combobox attributes
│       ├── ResultsList.tsx          Dropdown with loading/error/empty states
│       ├── ResultItem.tsx           Single result with highlight and category icon
│       ├── autocomplete.css         Styles
│       └── index.ts                Barrel export
├── hooks/
│   ├── useDebounce.ts              Debounce hook (configurable delay)
│   └── useAutocomplete.ts          Controller hook — the "brain" of the component
├── cache/
│   └── client-cache.ts             Normalized cache (Option 3 from frontend.md)
└── utils/
    └── api.ts                      Fetch wrapper with AbortController support
```

## Key Patterns

### Component Architecture (from frontend.md)

```
SearchInput (UI) → useAutocomplete (Controller) → ResultsList (UI)
                          ↓
                    ClientCache (Cache)
```

Maps to the MVC-like pattern described in the system design document.

### Normalized Cache (`cache/client-cache.ts`)

Option 3 from `frontend.md` — fast lookup without data duplication:
```
results: Map<id, SearchResult>     ← the "database"
queryCache: Map<query, id[]>       ← the "index"
```

The debug panel below the search box shows cache stats (queries cached, unique results, hit rate) in real-time.

### Debouncing (`hooks/useDebounce.ts`)

Default 300ms. Open the Network tab in DevTools to see the difference — typing "san francisco" fires 1-2 requests instead of 14.

### Race Condition Handling (`hooks/useAutocomplete.ts`)

Each new search aborts the previous in-flight request via AbortController. Combined with the normalized cache (keyed by query string), we always display results for the current input value.

### Accessibility

Follows the WAI-ARIA Combobox pattern:
- `role="combobox"` on input, `role="listbox"` on results
- `aria-expanded`, `aria-activedescendant`, `aria-autocomplete="list"`
- Keyboard: Arrow keys navigate, Enter selects, Escape dismisses
- `aria-live="polite"` announces new results to screen readers

See the comparison table in `frontend.md` for how Google, Facebook, and X implement these differently.
