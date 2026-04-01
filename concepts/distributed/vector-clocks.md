# Vector Clocks

**What**: A mechanism to track causality in distributed systems by maintaining a vector of logical timestamps, one per node, to determine if events are concurrent or causally related.

**When to use**: Detecting conflicts in eventually consistent systems, tracking causality for distributed debugging, implementing causal consistency, version conflict detection in multi-master databases.

**Tradeoffs**: Can accurately detect concurrent updates and maintain causal ordering, but vector size grows with number of nodes (can be mitigated with version vectors), and requires application-level conflict resolution.

## How It Works

### Lamport Timestamps (Simpler Predecessor)

Lamport clocks provide total ordering but cannot detect concurrency:
- Each node maintains a counter
- Increment counter on each event
- Send counter with messages; receiver takes max(local, received) + 1

**Limitation**: If A's timestamp < B's timestamp, you can't tell if A happened before B or they're concurrent.

### Vector Clocks

Vector clocks solve the concurrency detection problem:

Each node maintains a vector of counters `[N1, N2, N3, ...]`:
- One counter per node in the system
- Counter represents number of events seen from that node

**Operations**:

1. **Internal event**: Increment own counter
   ```
   Node A: [1, 0, 0] → [2, 0, 0]
   ```

2. **Send message**: Increment own counter, include vector in message
   ```
   Node A: [2, 0, 0] → [3, 0, 0], send with vector [3, 0, 0]
   ```

3. **Receive message**: Take element-wise max, then increment own counter
   ```
   Node B: [0, 2, 0] receives [3, 0, 0]
   Result: [max(0,3), max(2,0), max(0,0)] → [3, 2, 0] → [3, 3, 0]
   ```

**Comparing Vector Clocks**:

Given vectors A and B:
- **A < B** (A happened before B): All A[i] ≤ B[i] and at least one A[i] < B[i]
- **A > B** (B happened before A): All B[i] ≤ A[i] and at least one B[i] < A[i]
- **A || B** (concurrent): Neither A < B nor A > B

```
Example:

Version 1: [1, 0, 0] (Node A writes)
Version 2: [2, 0, 0] (Node A writes again) → Causal: V1 < V2

Version 3: [2, 1, 0] (Node B writes based on V2) → Causal: V2 < V3
Version 4: [2, 0, 1] (Node C writes based on V2) → Concurrent: V3 || V4

Application must merge V3 and V4
```

### Version Vectors (Optimization)

In practice, systems use version vectors (simplified vector clocks):
- Track one counter per replica, not per client
- Smaller vectors (replicas << clients)
- Used by Dynamo, Riak, Voldemort

Example with 3 replicas:
```
[A:2, B:1, C:0] — replica A has seen 2 updates, B has seen 1, C has seen 0
```

## Complexity / Performance

**Space Complexity**:
- **Vector clocks**: O(n) where n = number of nodes
- For large systems, n can be huge (millions of clients)
- **Version vectors**: O(r) where r = number of replicas (typically 3-10)

**Time Complexity**:
- **Update**: O(n) to merge vectors
- **Compare**: O(n) to determine causality
- **Typical n**: 3-10 replicas, so very fast in practice

**Storage Overhead**:
- Must store vector with each version
- Example: 3 replicas × 8 bytes = 24 bytes per version
- Can prune old versions after reconciliation
- Some systems limit vector size and fall back to timestamps

**Scalability Issues**:
- In systems with many clients, vector size can explode
- Mitigation: Use server-side version vectors, not client-side
- Mitigation: Garbage collect old entries
- Mitigation: Fall back to simpler schemes when vector exceeds threshold

## Real-World Examples

**Production Systems**:
- **Amazon Dynamo**: Original paper described vector clocks; later versions use version vectors
- **Riak**: Uses version vectors (called "vclock"); returns siblings when conflicts detected
- **Voldemort**: LinkedIn's Dynamo clone, uses vector clocks for versioning
- **CouchDB**: Uses revision trees (similar concept) for multi-master conflict detection
- **Cassandra**: Uses timestamps by default, but internally tracks version info

**Implementation Details**:

**Riak Example**:
```json
{
  "key": "user:123",
  "value": {"name": "Alice", "email": "alice@example.com"},
  "vclock": "a85hYGBgzGDKBVIcR4M2cgczH7HPYEpkymNlsP/VfYYvCwA="
}
```
If concurrent writes detected, Riak returns both siblings:
```json
[
  {"name": "Alice", "email": "alice@new.com", "vclock": "..."},
  {"name": "Alice", "email": "alice@other.com", "vclock": "..."}
]
```

**DynamoDB**:
- Internal implementation uses vector clocks
- Shopping cart example: merge concurrent adds/removes
- Client sees opaque version token, not raw vector

**Distributed Tracing**:
- **Jaeger/Zipkin**: Use causality tracking similar to vector clocks
- Track span relationships across services

**Collaborative Editing**:
- **Operational Transformation (OT)**: Uses causality tracking
- **CRDTs**: Some implementations use vector clocks internally

**Practical Challenges**:
- **Clock skew**: Vector clocks are logical, immune to system clock issues
- **Node churn**: Adding/removing nodes requires vector updates
- **Client-side storage**: Clients must store and return vectors (API complexity)

## Related Concepts

- [./eventual-consistency.md](./eventual-consistency.md) — Vector clocks enable conflict detection in eventually consistent systems
- [./cap-theorem.md](./cap-theorem.md) — Vector clocks used in AP systems to detect conflicts
- [../backend/replication.md](../backend/replication.md) — Multi-master replication uses vector clocks for versioning
- [./consensus.md](./consensus.md) — Alternative to vector clocks; consensus avoids conflicts entirely
