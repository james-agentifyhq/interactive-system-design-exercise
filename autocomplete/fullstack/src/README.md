# Autocomplete — Full-Stack Demo

A full-stack autocomplete implementation built for system design interview study. Demonstrates key data structures, caching patterns, and frontend architecture concepts.

## Architecture

```
Client (React)                          Server (Hono)
┌──────────────────────┐                ┌──────────────────────┐
│  SearchInput         │                │  API Layer           │
│       ↓              │   HTTP GET     │       ↓              │
│  useAutocomplete ────┼───────────────▶│  LRU Cache           │
│  (debounce, cache)   │   /api/search  │       ↓ (miss)       │
│       ↓              │                │  Searcher            │
│  ResultsList         │◀───────────────│       ↓              │
│                      │   JSON         │  Trie (prefix tree)  │
└──────────────────────┘                └──────────────────────┘
```

## Quick Start

```bash
# Terminal 1 — Backend (port 3001)
cd server && pnpm install && pnpm dev

# Terminal 2 — Frontend (port 5173)
cd client && pnpm install && pnpm dev
```

Open http://localhost:5173 and start typing.

## Key Concepts Demonstrated

| Concept | Backend | Frontend |
|---------|---------|----------|
| **Data Structure** | Trie (prefix tree) | Normalized cache |
| **Caching** | LRU Cache (linked list + hash map) | Query→ID map + result store |
| **Performance** | O(L) prefix lookup, cache-aside | Debouncing, AbortController |
| **Reliability** | Input validation, error responses | Race condition handling, error states |
| **Accessibility** | — | ARIA combobox, keyboard navigation |

## Running Tests

```bash
cd server && pnpm test
```

## Project Structure

```
src/
├── server/          → Hono API server (see server/README.md)
└── client/          → React frontend  (see client/README.md)
```

## Study Materials

- `../frontend/frontend.md` — Frontend system design deep dive
- `../backend/backend.md` — Backend system design deep dive
