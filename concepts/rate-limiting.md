# Rate Limiting

**What**: Controlling the rate of requests a client can make to prevent abuse, ensure fair resource allocation, and protect system stability.

**When to use**: On public APIs, authentication endpoints, expensive operations, or any service vulnerable to overload or abuse.

**Tradeoffs**: System protection and fairness vs. degraded user experience for legitimate heavy users; simple rules vs. complex per-user quotas.

## How It Works

**Common Algorithms**:

**1. Token Bucket**
- Bucket holds tokens, refilled at constant rate
- Each request consumes 1 token
- Allows bursts up to bucket capacity
```
Capacity: 100 tokens
Refill: 10 tokens/second
Burst: Can use 100 immediately, then 10/sec sustained
```

**2. Fixed Window**
- Count requests in fixed time windows (e.g., per minute)
- Resets at window boundary
- Simple but allows bursts at window edges
```
Window: 1 minute
Limit: 100 requests
00:00:50 - 99 requests → OK
00:01:00 - window resets
00:01:01 - 99 requests → OK
(198 requests in ~10 seconds)
```

**3. Sliding Window**
- Tracks requests with timestamps
- Count requests in rolling time window
- More accurate but higher memory/computation
```
Window: 1 minute rolling
At 00:01:30, count requests from 00:00:30 to 00:01:30
```

**4. Sliding Window Counter (Hybrid)**
- Combines fixed window simplicity with sliding accuracy
- Weighted count from current + previous window
- Good balance of accuracy and efficiency

**Client-Side vs Server-Side**:
- **Client-side**: Respects server limits, reduces wasted requests, improves UX (show quota remaining)
- **Server-side**: Enforces limits, returns 429 Too Many Requests, includes headers:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 23
  X-RateLimit-Reset: 1625097600
  Retry-After: 60
  ```

## Complexity / Performance

**Time Complexity**:
- Fixed window: O(1) - simple counter increment
- Token bucket: O(1) - check and decrement tokens
- Sliding window: O(log n) with sorted set (Redis ZSET)

**Space Complexity**:
- Fixed window: O(1) per user/IP
- Sliding window: O(requests in window) per user

**Implementation**:
- **In-memory**: Fast but lost on restart, not shared across servers
- **Redis**: Shared state, persistent, 1-5ms latency, supports atomic ops
- **Database**: Persistent but slower, adds DB load

**Distributed Systems**:
- Race conditions with concurrent requests across servers
- Solutions: Redis atomic ops, accept slight over-limit, eventual consistency

## Real-World Examples

- **GitHub API**: 5,000 requests/hour for authenticated users, token bucket style
- **Twitter API**: 15 requests/15-minute window per endpoint, very strict
- **Stripe API**: 100 requests/second, provides client libraries with automatic retry
- **CloudFlare**: DDoS protection, rate limiting by IP, geographic rules
- **nginx limit_req**: Token bucket implementation at web server level
- **AWS API Gateway**: Token bucket, configurable limits per API key

**Production Patterns**:
- Different limits for different endpoints (auth=10/min, read=1000/min)
- Tiered limits based on user subscription level
- Grace periods for legitimate bursts
- Progressive penalties (soft warnings before hard blocks)

## Related Concepts

- `./retry-and-backoff.md` - How clients should handle 429 responses
- `./api-design.md` - Rate limit headers and API contracts
- `./monitoring-and-observability.md` - Alerting on rate limit hits
- `./caching.md` - Reduce requests through caching
