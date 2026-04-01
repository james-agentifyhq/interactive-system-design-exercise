# Caching

**What**: Storing frequently accessed data in a fast-access layer to reduce latency and load on slower data sources.

**When to use**: When you have read-heavy workloads, expensive computations, or slow data sources that serve the same data repeatedly.

**Tradeoffs**: Improved performance and reduced load vs. increased complexity, stale data risks, and memory/storage costs.

## How It Works

Caching sits between clients and the source of truth (database, API, computation):

```
Client → Cache (fast) → Database/API (slow)
         ↓ HIT: return cached data
         ↓ MISS: fetch from source, populate cache, return data
```

**Common Patterns**:

- **Cache-aside (Lazy Loading)**: Application checks cache first. On miss, fetches from DB and writes to cache. App controls cache logic.
- **Write-through**: Writes go to cache AND database synchronously. Cache always has latest data but adds write latency.
- **Write-behind (Write-back)**: Writes go to cache immediately, asynchronously persisted to DB later. Fast writes but risk of data loss.

**Eviction Policies**:
- **LRU (Least Recently Used)**: Evicts items not accessed recently. Good for temporal locality.
- **LFU (Least Frequently Used)**: Evicts least-used items. Good for access frequency patterns.
- **FIFO (First In First Out)**: Simple but ignores access patterns.
- **TTL (Time To Live)**: Items expire after fixed time. Handles stale data explicitly.

## Complexity / Performance

**Time Complexity**:
- Cache hit: O(1) for hash-based caches (Redis, Memcached)
- Cache miss: O(1) cache lookup + O(source lookup time)
- LRU eviction: O(1) with doubly-linked list + hashmap

**Performance Impact**:
- Cache hit: 1-10ms (in-memory) vs 10-100ms+ (database query)
- Throughput: Can handle 100K+ ops/sec with Redis
- Memory: Tradeoff between hit rate and memory cost

**When NOT to cache**:
- Data changes frequently (high invalidation overhead)
- Each query is unique (low hit rate)
- Data must be real-time accurate
- Memory costs exceed performance gains

## Real-World Examples

- **CDNs**: Cloudflare, CloudFront cache static assets globally
- **Browser cache**: Stores images, CSS, JS with Cache-Control headers
- **Redis/Memcached**: Session data, user profiles, API responses
- **Application-level**: In-memory caches for config data, feature flags
- **Database query cache**: MySQL query cache (deprecated but illustrative)
- **CPU caches**: L1/L2/L3 caches use similar principles

## Related Concepts

- `./backend/lru-cache.md` - Detailed LRU implementation
- `./data-modeling.md` - How schema design affects cache efficiency
- `./api-design.md` - HTTP cache headers and ETags
- `./monitoring-and-observability.md` - Tracking cache hit rates and performance
