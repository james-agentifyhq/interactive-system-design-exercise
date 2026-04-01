# Replication

**What**: Maintaining copies of data across multiple servers to improve availability, fault tolerance, and read scalability.

**When to use**: High availability requirements (99.9%+ uptime), read-heavy workloads, geographic distribution, disaster recovery. Essential for production databases.

**Tradeoffs**: Improved availability and read throughput vs data consistency challenges, increased storage cost, replication lag, complex failover logic.

## How It Works

**Replication topologies**:

1. **Leader-follower (master-slave)**:
   - One leader handles writes, N followers replicate data
   - Reads can go to followers (scale reads)
   - Failover: Promote follower to leader if leader dies
   - Most common pattern (MySQL, Postgres, MongoDB)

2. **Multi-leader (multi-master)**:
   - Multiple nodes accept writes
   - Pros: Better write availability, lower latency (geo-distributed)
   - Cons: Write conflicts require resolution (last-write-wins, CRDTs)
   - Use cases: Multi-region databases, collaborative editing

3. **Leaderless (peer-to-peer)**:
   - All nodes accept reads/writes (Cassandra, DynamoDB)
   - Quorum reads/writes (W + R > N for consistency)
   - No failover needed, always available

```
Leader-Follower:
   Client writes
        ↓
    ┌──────┐
    │Leader│ (writes)
    └──────┘
      ↓   ↓ (replication)
   ┌────┐ ┌────┐
   │Fol1│ │Fol2│ (reads)
   └────┘ └────┘
```

**Synchronous vs asynchronous replication**:
- **Sync**: Leader waits for follower acknowledgment before confirming write
  - Pros: Strong consistency (followers always up-to-date)
  - Cons: Higher latency, availability risk (blocked if follower down)
- **Async**: Leader confirms write immediately, replicates in background
  - Pros: Low latency, high availability
  - Cons: Replication lag (eventual consistency), data loss on leader failure

**Semi-synchronous**: Wait for 1 follower (not all), balances latency and durability.

**Read replicas**: Followers dedicated to read queries (analytics, reporting). Reduces load on leader.

**Failover**:
- **Manual**: DBA promotes follower (safest but slow)
- **Automatic**: Monitoring detects leader failure, promotes follower with latest data
  - Challenges: Split-brain (two leaders), data loss if async replication, client redirection

## Complexity / Performance

- **Read throughput**: Scales linearly with replicas (if async)
- **Write throughput**: Limited by leader (sharding helps)
- **Latency**: Sync replication adds RTT (10-100ms cross-region), async adds none
- **Replication lag**: Typically <1s in same DC, 100ms-5s cross-region

**CAP theorem**: Can't have all of Consistency, Availability, Partition tolerance. Replication forces the tradeoff.

## Real-World Examples

- **MySQL**: Leader-follower with async/semi-sync replication, read replicas for scaling
- **PostgreSQL**: Streaming replication (sync/async), logical replication for selective tables
- **MongoDB**: Replica sets (leader-follower), automatic failover with election
- **Cassandra**: Leaderless, tunable consistency (W=1, R=1 for availability; W=QUORUM, R=QUORUM for consistency)
- **AWS RDS**: Automated backups, multi-AZ sync replication, read replicas
- **Netflix**: Cassandra multi-region with eventual consistency

## Related Concepts

- [`sharding.md`](./sharding.md) — Each shard is replicated independently
- [`load-balancing.md`](./load-balancing.md) — Distribute reads across replicas
- [`message-queues.md`](./message-queues.md) — Replicate queue state for HA
- Consensus algorithms (Raft, Paxos) — Coordinate failover and leader election
