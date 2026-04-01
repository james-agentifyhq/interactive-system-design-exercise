# Eventual Consistency

**What**: A consistency model where all replicas will converge to the same value given enough time without new writes, even if they're temporarily inconsistent.

**When to use**: High availability systems where low latency and partition tolerance are prioritized over immediate consistency; shopping carts, social media feeds, DNS, collaborative editing.

**Tradeoffs**: Higher availability and lower latency vs. application complexity in handling stale reads, conflicts, and requiring client-side or application-level conflict resolution.

## How It Works

Eventual consistency allows replicas to temporarily diverge but guarantees they'll converge:

1. **Write** to any replica without waiting for others
2. **Propagate** updates asynchronously in background
3. **Converge** when all replicas receive all updates
4. **Conflicts** handled via timestamps, vector clocks, or application logic

```
Time →

Replica 1:  [Write A] ----→ [Write B] ----→ [Sync] ----→ [A, B, C]
Replica 2:  ----→ [Write C] ----→ [Sync] ----→ [A, B, C]
Replica 3:  ----→ [Sync] ----→ [A] ----→ [Sync] ----→ [A, B, C]

Eventually consistent: all replicas converge to [A, B, C]
```

### Consistency Levels (Weakest to Strongest)

**1. Eventual Consistency** (base level)
- Only guarantees convergence, no ordering guarantees
- May read stale data or see writes out of order

**2. Monotonic Reads**
- Once you read a value, you'll never read an older value
- Prevents "going backwards in time"
- Implementation: session stickiness or client-side tracking

**3. Read Your Writes** (Read-after-Write Consistency)
- You always see your own writes
- Others may not see them immediately
- Implementation: route reads to same replica as writes, or track write versions

**4. Monotonic Writes**
- Writes from same client are applied in order
- Prevents write reordering

**5. Causal Consistency**
- Reads see all causally-related writes
- If A causes B, everyone sees A before B
- Unrelated concurrent writes may be seen in any order

### Conflict Resolution Strategies

**Last-Write-Wins (LWW)**:
- Use timestamp or version number
- Simple but can lose data
- Used by: Cassandra (default), Riak (option)

**Vector Clocks**:
- Track causality per replica
- Detect true conflicts vs. simple overwrites
- Application resolves conflicts
- Used by: Dynamo, Riak

**CRDTs (Conflict-Free Replicated Data Types)**:
- Data structures designed for automatic merge
- Examples: G-Counter (grow-only counter), PN-Counter (increment/decrement), OR-Set (add/remove)
- No coordination needed, mathematically guaranteed convergence
- Used by: Redis (with CRDT modules), Riak (maps), collaborative editing (Figma, Google Docs)

**Application-Level Merge**:
- Show both versions to user
- User resolves conflict
- Example: Google Docs suggestions, Git merge conflicts

### Quorum-Based Systems (Dynamo-style)

Configuration: N replicas, R read replicas, W write replicas

- **N**: Total number of replicas
- **W**: Number of replicas that must acknowledge write
- **R**: Number of replicas contacted for read

**Strong consistency**: R + W > N (overlap guarantees latest value)
**Eventual consistency**: R + W ≤ N (faster but may read stale)

Common configurations:
- **N=3, R=2, W=2**: Strong consistency, tolerates 1 failure
- **N=3, R=1, W=1**: Eventual consistency, fastest, least durable
- **N=3, R=1, W=3**: Fast reads, durable writes

## Complexity / Performance

**Latency**:
- **Write latency**: O(1) — respond after local write or W replicas
- **Read latency**: O(1) — respond from R replicas
- Much lower than consensus (no coordination round trips)

**Throughput**:
- **Very high**: No single leader bottleneck
- Can scale horizontally by adding replicas
- Typical: 100K-1M+ operations/sec per cluster

**Conflict Rate**:
- Depends on write concurrency
- Higher with more concurrent writers to same key
- Most workloads have low conflict rates (<1%)

**Availability**:
- Can tolerate N - W write failures
- Can tolerate N - R read failures
- Much higher than CP systems

## Real-World Examples

**Database Systems**:
- **Cassandra**: Tunable consistency (R/W/N), uses LWW by default, optional lightweight transactions
- **DynamoDB**: Eventual consistency by default, optional strong consistency, uses vector clocks internally
- **Riak**: Vector clocks for conflict detection, application-level resolution
- **CouchDB**: Multi-master replication, revision trees for conflict detection
- **MongoDB** (with eventual reads): Secondaries with eventual consistency

**Caching & CDN**:
- **DNS**: Classic eventual consistency (TTL-based, takes time to propagate updates)
- **CDN edge caches**: Updates propagate eventually, stale data acceptable
- **Memcached/Redis** (multi-master): Eventual consistency across regions

**Application Examples**:
- **Shopping cart** (Amazon): Add/remove items without coordination, merge on checkout
- **Social media feeds**: Likes, follows eventually propagate; perfect consistency not critical
- **Collaborative editing**: CRDTs for real-time collaboration (Figma, Notion, Google Docs)
- **Distributed counters**: Approximate counts, eventual accuracy (Twitter follower counts)
- **Session stores**: User sessions replicated across regions

**Real Production Architectures**:
- **Amazon.com shopping cart**: Classic example from Dynamo paper, uses vector clocks
- **LinkedIn**: Voldemort (Dynamo-inspired) for member profiles
- **Netflix**: Multi-region Cassandra for user preferences and viewing history
- **Discord**: Cassandra for message storage with eventual consistency

## Related Concepts

- [./cap-theorem.md](./cap-theorem.md) — Eventual consistency is the AP choice
- [./vector-clocks.md](./vector-clocks.md) — Mechanism for tracking causality and detecting conflicts
- [./consensus.md](./consensus.md) — Alternative approach prioritizing strong consistency
- [../backend/replication.md](../backend/replication.md) — Asynchronous replication enables eventual consistency
- [../caching/cache-invalidation.md](../caching/cache-invalidation.md) — Caches are eventually consistent with source of truth
