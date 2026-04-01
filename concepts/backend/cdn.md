# CDN

**What**: Content Delivery Network—geographically distributed servers that cache and serve static assets (images, CSS, JS, videos) from locations near users to reduce latency.

**When to use**: Serving static assets globally, reducing origin server load, improving page load times, handling traffic spikes, DDoS protection. Essential for consumer-facing sites with global users.

**Tradeoffs**: Faster delivery and reduced origin load vs cache invalidation complexity, cost (bandwidth, storage), stale content risk, limited dynamic content support.

## How It Works

**Architecture**:
```
User (Tokyo) → CDN Edge (Tokyo) → Origin Shield → Origin Server (US)
                  ↑ cache hit             ↑ optional layer
```

1. User requests `example.com/logo.png`
2. CDN edge server checks local cache
3. **Cache hit**: Serve from edge (1-10ms latency)
4. **Cache miss**: Fetch from origin, cache at edge, serve to user

**Push vs Pull CDN**:
- **Pull (origin pull)**: CDN fetches content on cache miss, caches lazily. Simple, default mode.
- **Push**: You upload content to CDN manually. Better for infrequent changes (software downloads).

**Cache invalidation**:
- **TTL (Time to Live)**: Content expires after N seconds (Cache-Control header). Balance freshness vs cache hit ratio.
- **Purge/invalidate**: Manually clear specific URLs (slow, expensive at scale).
- **Versioned URLs**: Use `logo.v2.png` or `logo.png?v=123` to bypass cache (best practice).

**Origin shield**: Additional caching layer between edge and origin. Reduces origin requests (cache-of-caches), protects origin from thundering herd.

**Edge computing**: Run code at CDN edge (Cloudflare Workers, Lambda@Edge) for dynamic content, A/B testing, auth, header manipulation.

## Complexity / Performance

- **Latency reduction**: 200ms (origin far away) → 10-50ms (edge nearby)
- **Cache hit ratio**: Typically 80-95% for static assets, higher is better
- **Throughput**: CDNs handle 100K+ requests/sec per edge location, scales globally
- **Cost**: Pay for bandwidth (egress) and requests. Typically $0.01-0.10/GB.

**Cold start**: First user in region sees cache miss (slow), subsequent users fast. Prefill cache with popular content.

## Real-World Examples

- **Cloudflare**: Global CDN with 300+ PoPs, free tier, DDoS protection, Workers for edge compute
- **AWS CloudFront**: Integrates with S3, Lambda@Edge, origin shield, pay-as-you-go
- **Akamai**: Largest CDN (2000+ PoPs), enterprise focus, streaming video
- **Fastly**: Programmable edge (VCL, edge compute), real-time purging, used by GitHub, Stripe
- **Google Cloud CDN**: Integrated with GCP, uses Google's global network
- **Netflix Open Connect**: Custom CDN with ISP-embedded caches for video streaming

**Use cases**:
- **E-commerce**: Product images, CSS/JS bundles (Shopify uses Fastly)
- **Video streaming**: Netflix, YouTube (CDN at every ISP)
- **Gaming**: Game downloads (Steam, Epic Games)
- **SaaS**: Serve app assets (Figma, Notion)

## Related Concepts

- [`lru-cache.md`](./lru-cache.md) — CDN edge servers use LRU eviction
- [`load-balancing.md`](./load-balancing.md) — CDN is geographic load balancer
- [`message-queues.md`](./message-queues.md) — Cache invalidation via events
- HTTP caching headers — Cache-Control, ETag, Expires for browser and CDN caching
