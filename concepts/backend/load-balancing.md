# Load Balancing

**What**: Distributing incoming network requests across multiple backend servers to maximize throughput, minimize latency, and prevent overload.

**When to use**: Any multi-server deployment for horizontal scaling, high availability, or traffic distribution. Essential for stateless web services, APIs, microservices.

**Tradeoffs**: Improved availability and throughput vs added complexity, single point of failure (mitigate with HA pairs), potential for uneven load with poor algorithms.

## How It Works

**Common algorithms**:
- **Round-robin**: Rotate through servers in order. Simple but ignores server load.
- **Least connections**: Route to server with fewest active connections. Better for long-lived connections.
- **Weighted**: Assign weights to servers (CPU/RAM capacity), distribute proportionally.
- **IP hash**: Hash client IP to server (sticky sessions for stateful apps).
- **Least response time**: Route to fastest server (requires health check latency tracking).
- **Consistent hashing**: Map requests to servers on a hash ring, minimal reshuffling on server add/remove.

```
Client requests
      ↓
  ┌───────────┐
  │Load Balancer│ ← Health checks
  └───────────┘
    /    |    \
   /     |     \
 Srv1  Srv2  Srv3
```

**L4 vs L7 load balancing**:
- **L4 (Transport layer)**: Routes based on IP/port, faster (no payload inspection), works with any protocol (TCP/UDP). Example: AWS NLB.
- **L7 (Application layer)**: Routes based on HTTP headers, cookies, URL path. Enables advanced routing (canary, A/B). Example: Nginx, HAProxy, AWS ALB.

**Health checks**: LB periodically pings servers (HTTP, TCP, custom endpoint). Removes unhealthy servers from rotation.

**Sticky sessions**: Pin client to same server (session affinity). Use cookies or IP hashing. Needed for stateful apps but reduces load distribution.

## Complexity / Performance

- **Latency**: Adds ~1-5ms for L4, ~5-10ms for L7 (content inspection overhead)
- **Throughput**: Modern LBs handle 100K-1M+ requests/sec
- **Scalability**: LBs themselves can be bottlenecks; use DNS round-robin or Anycast for multi-LB setup

**Availability**: Deploy LBs in HA pairs (active-passive or active-active with shared VIP via VRRP/BGP).

## Real-World Examples

- **AWS**: ELB (Classic), ALB (L7), NLB (L4), Global Accelerator (Anycast)
- **Google Cloud**: Cloud Load Balancing (global L7 with autoscaling)
- **Nginx**: Open-source L7 reverse proxy, widely used in Kubernetes ingress
- **HAProxy**: High-performance L4/L7 LB, popular in datacenters
- **Envoy**: Modern L7 proxy, backbone of service meshes (Istio, Consul)
- **Cloudflare**: Global L7 LB with DDoS protection

## Related Concepts

- [`sharding.md`](./sharding.md) — Consistent hashing for data partitioning
- [`replication.md`](./replication.md) — LB distributes reads across replicas
- [`cdn.md`](./cdn.md) — Geographic load distribution
- [`message-queues.md`](./message-queues.md) — Load leveling with queues
