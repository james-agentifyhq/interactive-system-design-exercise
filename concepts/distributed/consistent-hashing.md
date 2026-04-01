# Consistent Hashing

**What**: A distributed hashing scheme that maps both keys and nodes onto a hash ring, minimizing redistribution when nodes are added or removed.

**When to use**: Load balancing across dynamic server pools, distributed caching, CDN routing, data partitioning in NoSQL databases, service discovery, any system where nodes join/leave frequently.

**Tradeoffs**: Minimal key redistribution (only K/n keys move when adding/removing nodes) and simple implementation vs. potential load imbalance without virtual nodes and additional complexity for replica placement.

## How It Works

### Basic Concept

Traditional hashing: `hash(key) % n` → If n changes, almost all keys redistribute

Consistent hashing: Map both keys and nodes to positions on a ring (0 to 2^160 or similar):

1. **Hash nodes** to positions on ring: `hash(node_id) → position`
2. **Hash keys** to positions on ring: `hash(key) → position`
3. **Assign key** to first node clockwise from key's position

```
Hash Ring (0 to 2^160):

         0/2^160
            |
      Node C (45°)
           /
    Key X /
         /
   Key Y/          Node A (90°)
       /
      /
     |
Node B (270°)

Key X → Node C (first node clockwise)
Key Y → Node A (first node clockwise)
```

### Adding/Removing Nodes

**Adding Node D at 180°**:
- Only keys between B (270°) and D (180°) move to D
- All other keys stay with same node
- **Only K/n keys move** (vs. nearly all keys in traditional hashing)

**Removing Node C**:
- Keys from C move to A (next clockwise)
- All other keys unaffected

### Virtual Nodes (vnodes)

Problem: With few physical nodes, distribution can be uneven

Solution: Each physical node maps to multiple virtual nodes on ring

```
Physical Nodes: A, B, C
Virtual Nodes: A1, A2, A3, B1, B2, B3, C1, C2, C3

Ring: A1 → B2 → C1 → A3 → B1 → C3 → A2 → B3 → C2

Better distribution: each physical node gets ~1/3 of keys
More granular: adding/removing nodes affects smaller chunks
```

**Typical vnodes**: 128-512 per physical node

### Replication

For fault tolerance, store key at next N nodes clockwise:

```
Replication factor N=3:
Key X at position 45° → store at Node C (45°), Node A (90°), Node B (270°)
```

Prefer replicas on different physical nodes (skip vnodes from same physical node).

## Complexity / Performance

**Lookup Time**:
- **Without vnodes**: O(n) linear scan or O(log n) with binary search
- **With vnodes**: O(log v) where v = total virtual nodes
- Typical: 3-5 nodes × 256 vnodes = ~1000 positions → ~10 comparisons

**Key Redistribution**:
- **Adding node**: Only K/n keys move (minimal)
- **Removing node**: Only K/n keys move
- vs. traditional hashing: ~K × (n-1)/n keys move (nearly all)

**Load Balance**:
- **Without vnodes**: Can have 2-3× imbalance
- **With vnodes**: Typically <10% imbalance
- More vnodes → better balance but more metadata overhead

**Space Complexity**:
- Store sorted list of (position, node) tuples
- O(n × v) where n = nodes, v = vnodes per node
- Typical: 1000 entries × 16 bytes = 16 KB (negligible)

## Real-World Examples

### Distributed Databases

**Amazon DynamoDB**:
- Uses consistent hashing with virtual nodes
- Each node handles multiple vnodes (partitions)
- Automatic rebalancing when nodes added/removed
- Typically 128-256 vnodes per physical node

**Apache Cassandra**:
- Originally used consistent hashing (pre-1.2)
- Now uses virtual nodes (vnodes) by default
- Default: 256 vnodes per node
- Replication: Store at N replicas across different racks

**Riak**:
- Uses consistent hashing with vnodes
- Configurable number of vnodes (default 64)
- Preference lists define replica locations

**Memcached** (with ketama algorithm):
- Client-side consistent hashing
- Minimal cache invalidation when servers added/removed
- Used by Facebook, Reddit, etc.

### CDN & Load Balancing

**CDN Edge Routing**:
- Route requests to geographically nearest edge server
- Consistent hashing ensures same content on same servers (cache hit rate)
- Adding/removing edge servers minimally disrupts cached content

**Akamai**:
- Uses consistent hashing for content routing
- Ensures content requests hit same cache servers

**HAProxy/Nginx**:
- Support consistent hashing for backend selection
- Sticky sessions with minimal disruption during scaling

**Service Mesh** (Envoy, Linkerd):
- Consistent hashing for routing requests to service instances
- Maintain session affinity while allowing dynamic scaling

### Real Applications

**Discord**:
- Uses consistent hashing to route guild (server) data to specific nodes
- Ensures same guild always handled by same nodes (better caching)

**Twitch**:
- Routes chat rooms to specific servers using consistent hashing
- Adding chat servers doesn't disrupt existing rooms

**Chord DHT** (Distributed Hash Table):
- Peer-to-peer system using consistent hashing
- Each node responsible for keys between itself and predecessor
- Used in file-sharing systems, distributed storage

**Kafka** (partition assignment):
- While not pure consistent hashing, uses similar concept
- Partition assignment to consumers using sticky partitioner

### Configuration Examples

**Cassandra**:
```yaml
num_tokens: 256  # virtual nodes per physical node
```

**Redis Cluster**:
```
16384 hash slots distributed across nodes
Similar to vnodes but fixed slot count
```

**DynamoDB**:
```
Automatic partitioning using consistent hashing
No user configuration needed
```

## Related Concepts

- [../backend/sharding.md](../backend/sharding.md) — Consistent hashing is a sharding strategy
- [../backend/replication.md](../backend/replication.md) — Determines replica placement on ring
- [../caching/distributed-cache.md](../caching/distributed-cache.md) — Used for cache server selection
- [./cap-theorem.md](./cap-theorem.md) — Affects availability during node changes
- [../backend/load-balancing.md](../backend/load-balancing.md) — Alternative to round-robin for stateful services
