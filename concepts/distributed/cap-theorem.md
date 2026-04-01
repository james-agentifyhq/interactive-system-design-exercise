# CAP Theorem

**What**: A distributed system can only guarantee two out of three properties: Consistency, Availability, and Partition tolerance.

**When to use**: Use CAP as a framework for reasoning about tradeoffs when designing distributed data stores or services that replicate data across network boundaries.

**Tradeoffs**: In practice, partition tolerance (P) is unavoidable in distributed systems, so the real choice is between CP (strong consistency, sacrifice availability during partitions) and AP (high availability, accept eventual consistency).

## How It Works

The CAP theorem states:

- **Consistency (C)**: All nodes see the same data at the same time. Every read receives the most recent write.
- **Availability (A)**: Every request receives a non-error response, without guarantee that it contains the most recent write.
- **Partition tolerance (P)**: The system continues to operate despite network partitions (messages lost or delayed between nodes).

```
        CAP Triangle
           /\
          /  \
         / CP \    (Consistent + Partition tolerant)
        /______\
       /   ||   \
      / AP || CA \  (Available + Partition tolerant) || (Consistent + Available)
     /___________\
```

When a network partition occurs, you must choose:
- **CP systems**: Block requests to maintain consistency (sacrifice availability)
- **AP systems**: Serve potentially stale data (sacrifice consistency)
- **CA systems**: Not realistic in distributed environments (partitions will happen)

**PACELC Extension**: A more nuanced view:
- **If Partition (P)**: choose Availability (A) or Consistency (C)
- **Else (E)**: choose Latency (L) or Consistency (C)

Even without partitions, you trade consistency for lower latency.

## Complexity / Performance

- **CP systems**: Higher latency during normal operation (consensus required), unavailable during partitions
- **AP systems**: Lower latency, always available, but eventual consistency means application complexity in handling conflicts
- **PACELC trade-offs**: Even choosing AP doesn't mean zero cost — conflict resolution, version vectors, and application-level merging add complexity

## Real-World Examples

**CP Systems** (strong consistency over availability):
- **HBase**: Uses ZooKeeper for coordination; blocks writes during region server failures
- **MongoDB** (with majority reads/writes): Primary election ensures consistency; secondaries can't serve reads during partition
- **Redis Cluster** (with WAIT command): Can ensure writes propagate to replicas before acknowledging
- **etcd, Consul**: Consensus-based key-value stores for configuration and service discovery

**AP Systems** (availability over consistency):
- **Cassandra**: Tunable consistency; can choose AP mode with eventual consistency
- **DynamoDB**: Multi-master replication with eventual consistency by default
- **Riak**: Designed for high availability with vector clocks for conflict resolution
- **CouchDB**: Multi-master with conflict detection and resolution

**PACELC Examples**:
- **Cassandra**: PA/EL (choose A during partition, choose L over C during normal operation)
- **MongoDB**: PC/EC (choose C during partition, choose C over L in normal operation)
- **DynamoDB**: PA/EL (availability and low latency prioritized)

## Related Concepts

- [../distributed/consensus.md](./consensus.md) — CP systems rely on consensus algorithms
- [../distributed/eventual-consistency.md](./eventual-consistency.md) — AP systems implement eventual consistency
- [../distributed/vector-clocks.md](./vector-clocks.md) — Used in AP systems to detect conflicts
- [../backend/replication.md](../backend/replication.md) — Replication strategies differ between CP and AP systems
