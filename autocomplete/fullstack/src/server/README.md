# Autocomplete Server

Hono-based API server with a hand-rolled Trie and LRU Cache — the two core data structures commonly asked in system design interviews.

## Running

```bash
pnpm install
pnpm dev          # watch mode (auto-restart on changes)
pnpm start        # production
pnpm test         # run all tests
pnpm test:watch   # watch mode
```

Server runs on http://localhost:3001.

## API

### `GET /api/search?q={query}&limit={limit}&delay={delay}`

Search for items matching a prefix.

| Param   | Type   | Default | Description |
|---------|--------|---------|-------------|
| `q`     | string | required | Search prefix |
| `limit` | number | 10 | Max results (1-50) |
| `delay` | number | 0 | Artificial delay in ms (for testing loading UI) |

**Response:**
```json
{
  "query": "san",
  "results": [
    {
      "id": 1,
      "name": "San Francisco",
      "category": "city",
      "highlight": { "start": 0, "end": 3 },
      "score": 192
    }
  ],
  "meta": { "total": 6, "took": 0.21, "cached": false }
}
```

### `GET /api/stats`
Cache hit/miss statistics and dataset info.

### `GET /api/health`
Health check.

## Project Structure

```
src/
├── index.ts              API routes, middleware, CORS
├── data/
│   └── dataset.json      200 items (cities, companies, tech, people)
├── search/
│   ├── trie.ts           Trie (prefix tree) — O(L) prefix lookup
│   └── searcher.ts       Search service — trie + ranking + cache orchestration
└── cache/
    └── lru-cache.ts      LRU Cache — doubly-linked list + hash map, TTL support

test/
├── trie.test.ts          Trie unit tests
├── lru-cache.test.ts     LRU Cache unit tests (incl. eviction, TTL)
└── api.test.ts           API integration tests
```

## Interview-Relevant Data Structures

### Trie (`search/trie.ts`)
- `insert(word, id)` — O(L) where L = word length
- `search(prefix)` — O(L), returns all matching item IDs
- Case-insensitive, stores item IDs at every node along the path
- Multi-word support: "San Francisco" is searchable by both "san" and "francisco"

### LRU Cache (`cache/lru-cache.ts`)
- `get(key)` / `set(key, value)` — both O(1)
- Doubly-linked list for ordering + hash map for lookup (classic LeetCode #146)
- TTL-based expiration per entry
- Hit/miss statistics for monitoring

### Ranking (`search/searcher.ts`)
```
score = exactMatchBonus(200) + prefixStartBonus(100) + wordStartBonus(50) + popularity(0-100)
```
