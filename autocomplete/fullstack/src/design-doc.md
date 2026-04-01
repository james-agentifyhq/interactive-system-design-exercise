# Traditional Autocomplete — Design Doc

## Overview

A search-as-you-type autocomplete system using classical data structures. User types a prefix, results appear ranked by relevance and popularity. No AI/ML — pure algorithmic search.

This implements the architecture described in `autocomplete/frontend/frontend.md` and `autocomplete/backend/backend.md`.

## Architecture

```
┌──────────────────────────────────────────────────┐
│                    Client (React)                 │
│                                                   │
│  Keystroke → useDebounce (300ms) → useAutocomplete│
│                                        │          │
│                              ┌─────────▼────────┐ │
│                              │  Normalized Cache │ │
│                              │  (client-side)    │ │
│                              └────────┬─────────┘ │
│                                 miss? │           │
│                   AbortController ←───┤           │
│                                       ▼           │
└───────────────────── fetch /api/search?q= ────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Hono API Server     │
                    │   (CORS, logging,     │
                    │    validation)        │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │      Searcher         │
                    │   (orchestrator)      │
                    │                       │
                    │  ┌─────────────────┐  │
                    │  │   LRU Cache     │  │
                    │  │ (cache-aside)   │  │
                    │  └────────┬────────┘  │
                    │     miss? │           │
                    │  ┌────────▼────────┐  │
                    │  │     Trie        │  │
                    │  │ (prefix tree)   │  │
                    │  └────────┬────────┘  │
                    │           │ matching IDs│
                    │  ┌────────▼────────┐  │
                    │  │  Score & Rank   │  │
                    │  └─────────────────┘  │
                    └───────────────────────┘
```

## Data Flow

1. User types → each keystroke updates `query` state
2. `useDebounce` delays propagation by 300ms — only the final value fires
3. `useAutocomplete` checks `ClientCache` (normalized, keyed by query string)
4. **Cache hit**: Return cached results immediately, no network request
5. **Cache miss**: Abort any in-flight request (`AbortController`), fetch `GET /api/search?q=<query>&limit=10`
6. Server `Searcher` checks its `LRUCache` (keyed by `query:limit`)
7. **Server cache hit**: Return cached results
8. **Server cache miss**: Query `Trie` for matching item IDs → look up full items → score/rank → cache → return
9. Client caches the response (normalized by item ID) → renders results list

## File Structure

```
fullstack/src/
├── server/
│   ├── package.json                    # hono, @hono/node-server, tsx, vitest
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                    # Hono app: CORS, logging, GET /api/search, /stats, /health
│   │   ├── search/
│   │   │   ├── trie.ts                 # Prefix tree: O(L) insert and search
│   │   │   └── searcher.ts             # Orchestrator: cache-aside + Trie + scoring
│   │   ├── cache/
│   │   │   └── lru-cache.ts            # Doubly-linked list + hash map, TTL support
│   │   └── data/
│   │       └── dataset.json            # Cities, companies, tech, people with popularity scores
│   └── test/
│       ├── api.test.ts                 # HTTP endpoint tests
│       ├── trie.test.ts                # Prefix search, case-insensitivity, edge cases
│       └── lru-cache.test.ts           # Eviction, TTL expiration, stats
│
└── client/
    ├── package.json                    # react 19, vite 6, typescript 5.7
    ├── vite.config.ts                  # Port 5173, proxies /api → localhost:3001
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx                    # React root
        ├── App.tsx                     # Layout, concepts callout
        ├── types.ts                    # SearchResult, SearchResponse, AutocompleteStatus
        ├── cache/
        │   └── client-cache.ts         # Normalized cache: Map<id, result> + Map<query, ids[]>
        ├── components/Autocomplete/
        │   ├── Autocomplete.tsx         # Controller: keyboard nav, focus/blur, ARIA wiring
        │   ├── SearchInput.tsx          # ARIA combobox input
        │   ├── ResultsList.tsx          # ARIA listbox, loading/error states
        │   ├── ResultItem.tsx           # ARIA option, highlight matching substring
        │   ├── autocomplete.css
        │   └── index.ts
        ├── hooks/
        │   ├── useDebounce.ts           # setTimeout + cleanup, generic <T>
        │   └── useAutocomplete.ts       # Orchestrator: debounce → cache → fetch → state
        └── utils/
            └── api.ts                   # fetch wrapper for /api/search
```

## Key Patterns

### Backend

**Trie (Prefix Tree)** — `server/src/search/trie.ts`
- O(L) prefix lookup where L = query length, independent of dataset size
- Each node stores a `Set<number>` of item IDs passing through that prefix
- Case-insensitive (lowercases on insert and search)
- Multi-word support: "San Francisco" is inserted as both full name and individual words ("Francisco")

**LRU Cache** — `server/src/cache/lru-cache.ts`
- Doubly-linked list + `Map` for O(1) get/set/evict
- Sentinel head/tail nodes eliminate null checks
- TTL support: entries expire after configurable duration
- Hit/miss stats tracking

**Cache-Aside Pattern** — `server/src/search/searcher.ts`
- Check cache → on miss, compute (Trie search + scoring) → store in cache → return
- Cache key: `"${query}:${limit}"` — different limits get different cache entries

**Scoring/Ranking** — `searcher.scoreItem()`
- `score = popularity(0-100) + exactMatchBonus(200) + prefixBonus(100) + wordStartBonus(50)`
- Ensures exact matches first, then prefix matches, then word-start matches, with popularity as tiebreaker

### Frontend

**Normalized Client Cache** — `client/src/cache/client-cache.ts`
- Two Maps: `results` (id → data) and `queryCache` (query → id[])
- Same result appearing for "fa" and "fac" is stored once
- TTL-based expiration
- Same pattern as Redux/normalizr

**Debouncing** — `client/src/hooks/useDebounce.ts`
- 300ms delay before propagating value changes
- Each keystroke resets the timer (core debounce mechanic)
- Reduces API calls from ~13 to 1-2 for a typical query

**Race Condition Handling** — `client/src/hooks/useAutocomplete.ts`
- `AbortController` cancels stale in-flight requests on each new query
- Results stored by query key in normalized cache — only current query's results displayed
- Effect cleanup aborts on unmount or query change

**Accessibility** — `client/src/components/Autocomplete/`
- Full WAI-ARIA Combobox pattern
- `role="combobox"`, `aria-expanded`, `aria-activedescendant`
- `role="listbox"` + `role="option"` + `aria-selected`
- `aria-live="polite"` for screen reader announcements
- Complete keyboard navigation: ArrowUp/Down, Enter to select, Escape to close

## Running

see [README](./README.md)