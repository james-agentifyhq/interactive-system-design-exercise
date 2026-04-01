# Consensus

**What**: A protocol that allows distributed nodes to agree on a single value or sequence of operations, even in the presence of failures.

**When to use**: Leader election, distributed locks, configuration management, coordinating cluster membership, ensuring linearizable operations across replicas.

**Tradeoffs**: Strong consistency and fault tolerance at the cost of availability during partitions, higher latency (requires majority agreement), and increased operational complexity.

## How It Works

Consensus algorithms solve the problem of getting multiple nodes to agree on a value when:
- Nodes may fail or be slow
- Messages may be lost, delayed, or duplicated
- Network partitions can occur

### Raft (The Approachable Algorithm)

Raft is designed for understandability with three main components:

**1. Leader Election**
- Nodes are in one of three states: follower, candidate, or leader
- Followers receive heartbeats from leader
- If heartbeat timeout, follower becomes candidate and requests votes
- Candidate with majority votes becomes leader

**2. Log Replication**
- Leader receives client requests and appends to its log
- Leader replicates entries to followers
- Once majority has replicated, entry is committed
- Leader notifies followers of committed entries

**3. Safety**
- Only nodes with up-to-date logs can become leader
- Committed entries are never lost
- If two logs contain an entry at same index/term, all prior entries are identical

```
Raft Lifecycle:
[Client] --> [Leader] --> replicates --> [Follower 1]
                      --> replicates --> [Follower 2]
                      --> replicates --> [Follower 3]

Leader waits for majority (3/5), then commits and responds to client
```

### Paxos (The Original)

Paxos is the original consensus algorithm but harder to understand:
- **Proposers**: Propose values
- **Acceptors**: Accept or reject proposals
- **Learners**: Learn the chosen value

Paxos operates in phases:
1. **Prepare phase**: Proposer sends prepare request with proposal number
2. **Promise phase**: Acceptors promise not to accept older proposals
3. **Accept phase**: Proposer sends value to acceptors
4. **Accepted phase**: Acceptors accept if no newer proposal seen

Multi-Paxos optimizes for multiple rounds with a stable leader.

## Complexity / Performance

**Latency**:
- **Best case**: 1 round trip (leader to majority of followers)
- **With leader election**: Multiple round trips; election can take seconds
- **Network partition**: System unavailable until majority can communicate

**Throughput**:
- Leader is bottleneck for all writes
- Can pipeline requests for better throughput
- Typical: 1000-10000 writes/sec per cluster

**Space**:
- O(n) for log entries (must persist all history or snapshot periodically)
- Log compaction/snapshotting required for long-running systems

**Fault Tolerance**:
- Tolerates f failures in a (2f + 1) node cluster
- 3 nodes: tolerates 1 failure
- 5 nodes: tolerates 2 failures

## Real-World Examples

**Consensus-Based Systems**:
- **etcd**: Uses Raft; key-value store for Kubernetes configuration and coordination
- **Consul**: Raft-based service mesh and configuration store
- **ZooKeeper**: Uses ZAB (similar to Paxos); coordination service for Hadoop, Kafka, HBase
- **CockroachDB**: Uses Raft for replication and consensus per range
- **TiKV**: Raft-based distributed transactional key-value store

**Use Cases**:
- **Leader election**: Ensuring single leader for database cluster (MongoDB, PostgreSQL with Patroni)
- **Distributed locking**: Coordinating exclusive access to resources
- **Configuration management**: Storing and distributing cluster configuration
- **Metadata management**: Tracking shard locations, partition assignments
- **Transaction coordination**: Two-phase commit coordinator election

**Commercial Examples**:
- **Google Chubby**: Paxos-based lock service (internal)
- **Amazon Aurora**: Uses quorum-based consensus for replication
- **Microsoft Azure Cosmos DB**: Uses modified Paxos for replication

## Related Concepts

- [./cap-theorem.md](./cap-theorem.md) — Consensus enables CP systems
- [./eventual-consistency.md](./eventual-consistency.md) — Alternative approach that avoids consensus
- [../backend/replication.md](../backend/replication.md) — Consensus used for synchronous replication
- [../backend/sharding.md](../backend/sharding.md) — Consensus can manage shard assignment and metadata
