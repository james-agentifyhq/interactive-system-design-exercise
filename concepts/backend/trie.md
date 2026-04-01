# Trie

**What**: A tree data structure for storing strings where each node represents a character, enabling efficient prefix-based operations.

**When to use**: Autocomplete, spell checking, IP routing tables, dictionary lookups, prefix matching where you need fast lookups by prefix rather than exact key.

**Tradeoffs**: Fast prefix queries (O(L)) vs higher memory overhead compared to hash tables; excellent for shared prefixes but wasteful for sparse datasets.

## How It Works

Each node stores a character and pointers to child nodes. Words are stored as paths from root to leaf, with a flag marking valid word endings.

```
Insert "cat", "car", "dog":
        root
       /    \
      c      d
      |      |
      a      o
     / \     |
    t   r    g
   *    *    *
```

Basic operations:
- **Insert**: Traverse/create nodes for each character, mark end: O(L) where L = word length
- **Search**: Follow character path, check end flag: O(L)
- **StartsWith** (prefix): Follow path without needing end flag: O(L)
- **Delete**: Remove end flag or prune unused branches: O(L)

## Complexity / Performance

- **Time**: O(L) for insert, search, delete where L = key length (independent of total keys)
- **Space**: O(ALPHABET_SIZE × N × L) worst case, but typically much better with shared prefixes
- **Memory**: Higher than hash tables (~26 pointers per node for lowercase English), but compression helps

**Variants**:
- **Compressed/Radix Trie**: Merge single-child chains into edge labels (saves space, used in routing)
- **Ternary Search Tree**: Each node has 3 children (less/equal/greater), uses less memory than standard trie
- **HAT-trie**: Hybrid array/trie for cache efficiency

## Real-World Examples

- **Autocomplete systems**: Google search suggestions, IDE code completion
- **IP routing**: Longest prefix matching in network routers (CIDR blocks)
- **Databases**: Prefix indexes in PostgreSQL, MongoDB text search
- **File systems**: Directory structures, path lookups
- **Spell checkers**: Find words within edit distance of input
- **T9 predictive text**: Phone number to word mapping

## Related Concepts

- [`database-indexing.md`](./database-indexing.md) — Inverted indexes for full-text search as alternative
- [`lru-cache.md`](./lru-cache.md) — Often combined with tries to cache frequent autocomplete results
- Hash tables — Better for exact-match lookups but can't do prefix queries
