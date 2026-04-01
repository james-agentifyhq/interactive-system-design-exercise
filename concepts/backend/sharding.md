# Sharding

**What**: Horizontal partitioning of data across multiple databases or servers, where each shard holds a subset of the total dataset.

**When to use**: When a single database can't handle load (write throughput, storage, read queries). Scales writes, not just reads. Common at 1TB+ datasets or 10K+ writes/sec.

**Tradeoffs**: Linear scalability and no single bottleneck vs complexity (cross-shard queries, transactions, rebalancing), loss of referential integrity, operational overhead.

## How It Works

**Sharding strategies**:

1. **Hash-based**: `shard = hash(key) % num_shards`
   - Pros: Even distribution, simple
   - Cons: Hard to rebalance (resharding requires migration), range queries span all shards

2. **Range-based**: Partition by key ranges (e.g., A-M → shard1, N-Z → shard2)
   - Pros: Efficient range queries, easier to add shards
   - Cons: Hotspots if keys aren't uniformly distributed (e.g., timestamp-based)

3. **Directory-based**: Lookup table maps keys to shards
   - Pros: Flexible, easy to rebalance
   - Cons: Lookup table is bottleneck/SPOF, extra hop

4. **Geo-based**: Shard by region (US-East, EU-West)
   - Pros: Data locality, latency, compliance
   - Cons: Uneven load across regions

```
Hash-based sharding example:
user_id: 12345 → hash(12345) % 4 = 1 → Shard 1

App Layer
    ↓
┌─────────────┐
│Shard Router │ (knows sharding logic)
└─────────────┘
   /    |    \
Shard0 Shard1 Shard2
 (0-3k) (3-6k) (6-9k)
```

**Shard key selection**: Most critical decision. Criteria:
- High cardinality (many unique values)
- Evenly distributed
- Rarely changes (resharding is expensive)
- Supports common query patterns

Examples: `user_id` (not `country`), `order_id` (not `created_at`)

**Cross-shard queries**: Scatter-gather (query all shards, merge results). Slow and complex. Mitigate with denormalization or separate OLAP database.

**Rebalancing**: Adding/removing shards requires data migration. Use consistent hashing to minimize movement (only K/n keys move, not all).

## Complexity / Performance

- **Throughput**: Scales linearly with shards (if well-balanced)
- **Latency**: Single-shard queries stay fast; cross-shard queries 2-10x slower
- **Storage**: Unlimited (horizontal scaling)
- **Hotspots**: Celebrity users, trending topics can overwhelm one shard. Mitigate with further splitting or caching.

**Rebalancing cost**: Moving 1TB at 100MB/s = ~3 hours downtime or complex dual-write migration.

## Real-World Examples

- **MongoDB**: Hash/range-based sharding with automatic balancing
- **Cassandra**: Consistent hashing (vnodes) for even distribution
- **Vitess** (YouTube): MySQL sharding middleware, powers YouTube/Slack
- **Instagram**: Postgres sharding by user_id, 1000+ shards
- **Discord**: Cassandra for messages, sharded by channel_id
- **Uber**: Geo-sharded databases for rider/driver matching

## Related Concepts

- [`replication.md`](./replication.md) — Each shard is replicated for HA
- [`load-balancing.md`](./load-balancing.md) — Consistent hashing for request routing
- [`database-indexing.md`](./database-indexing.md) — Indexes per shard
- [`message-queues.md`](./message-queues.md) — Partition queues similarly to shards
