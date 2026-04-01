# LRU Cache

**What**: A fixed-size cache that evicts the least-recently-used item when capacity is reached, implemented with a doubly-linked list and hash map for O(1) operations.

**When to use**: Caching database queries, API responses, computed values, browser caches, OS page replacement. When recent access predicts future access.

**Tradeoffs**: Simple eviction policy with O(1) ops vs not always optimal (one-time scans pollute cache); requires more space than simple hash map (linked list pointers).

## How It Works

**Data structures**:
- **Hash map**: key → list node (for O(1) lookup)
- **Doubly-linked list**: ordered by recency (head = most recent, tail = least recent)

```
Hash Map          Doubly-Linked List (MRU → LRU)
┌─────┬────┐      ┌───┐   ┌───┐   ┌───┐   ┌───┐
│ k1  │ ●──┼─────→│k1 │←→│k3 │←→│k2 │←→│   │
│ k2  │ ●──┼───┐  │v1 │   │v3 │   │v2 │   │   │
│ k3  │ ●──┼─┐ └─→└───┘   └───┘   └───┘   └───┘
└─────┴────┘ └───────────────────────────────┘
                            sentinel nodes
```

**Operations**:
- **Get(key)**: Hash lookup → move node to head → return value: O(1)
- **Put(key, value)**: If exists, update & move to head; else create node at head, evict tail if full: O(1)

**Sentinel nodes pattern** (LeetCode #146): Use dummy head/tail nodes to avoid null checks:
```python
class LRUCache:
    def __init__(self, capacity):
        self.head = Node(0, 0)  # sentinel
        self.tail = Node(0, 0)  # sentinel
        self.head.next = self.tail
        self.tail.prev = self.head
```

**TTL support**: Add expiration timestamp to nodes, lazy check on get, or background cleanup thread.

## Complexity / Performance

- **Time**: O(1) for get, put, delete
- **Space**: O(capacity) for hash map + doubly-linked list (3 pointers per entry: prev, next, hash bucket)
- **Thread safety**: Requires locking (read-write lock or striped locks for concurrency)

**Variants**:
- **LFU** (Least Frequently Used): Track access frequency instead of recency
- **ARC** (Adaptive Replacement Cache): Balances recency and frequency
- **2Q/MQ**: Multi-queue to handle scan resistance

## Real-World Examples

- **Redis**: MAXMEMORY with `allkeys-lru` eviction policy
- **Memcached**: Slab allocator with LRU per slab class
- **CPU caches**: L1/L2/L3 approximate LRU with pseudo-LRU (cheaper in hardware)
- **Browser caches**: HTTP cache, DNS cache
- **CDN edge servers**: Cache hot content near users
- **Database buffer pools**: InnoDB buffer pool, PostgreSQL shared buffers

## Related Concepts

- [`cdn.md`](./cdn.md) — Edge caching strategies
- [`sharding.md`](./sharding.md) — Cache sharding for distributed systems
- [`message-queues.md`](./message-queues.md) — Cache invalidation via events
