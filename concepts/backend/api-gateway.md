# API Gateway

**What**: A single entry point that sits between clients and backend services, handling cross-cutting concerns like authentication, rate limiting, routing, and protocol translation.
**When to use**: When you have multiple backend services and want to centralize auth, rate limiting, logging, and request routing instead of duplicating them in every service.
**Tradeoffs**: Simplifies clients and centralizes concerns, but adds a network hop (~1-5ms latency) and becomes a single point of failure if not deployed with redundancy.

## How It Works

```
Clients (web, mobile, IoT)
        │
        ▼
┌──────────────────┐
│   API Gateway    │  ← Auth, rate limit, route, transform, log
└──┬───┬───┬───┬───┘
   │   │   │   │
   ▼   ▼   ▼   ▼
 Svc  Svc  Svc  Svc   ← Backend microservices
```

**Request lifecycle**:
1. Client sends request to gateway
2. Gateway authenticates (JWT, API key, OAuth token)
3. Gateway checks rate limits (per-user, per-IP, per-endpoint)
4. Gateway routes to the correct backend service
5. Gateway may transform request/response (add headers, aggregate multiple service calls)
6. Gateway logs the request and returns the response

**Key responsibilities**:
- **Authentication/Authorization**: Verify tokens once at the edge, pass identity downstream
- **Rate limiting**: Enforce per-user/per-IP quotas (often using [token bucket or sliding window](../rate-limiting.md))
- **Routing**: Map `/api/search` → search service, `/api/users` → user service
- **Load balancing**: Distribute traffic across service instances
- **Protocol translation**: Accept REST from clients, speak gRPC to internal services
- **Request aggregation**: Combine multiple microservice calls into a single client response (BFF pattern)
- **Caching**: Cache responses for idempotent GET requests at the edge
- **Observability**: Centralized logging, metrics, tracing for all traffic

## Complexity / Performance

- Adds ~1-5ms latency per request (network hop + processing)
- At scale, the gateway itself must be horizontally scaled and load-balanced
- Throughput depends on implementation: Envoy/NGINX handle 100K+ RPS, managed services (AWS API Gateway) vary by tier

## Real-World Examples

| Gateway | Type | Used by |
|---------|------|---------|
| **NGINX** | Self-hosted, reverse proxy | Netflix, Dropbox, WordPress |
| **Envoy** | Self-hosted, L7 proxy | Lyft, Airbnb (via Istio service mesh) |
| **Kong** | Open-source + managed | Nasdaq, Samsung |
| **AWS API Gateway** | Managed | Serverless architectures, Lambda-backed APIs |
| **Cloudflare Workers** | Edge-deployed | Acts as gateway + CDN + compute at the edge |
| **Zuul** | Self-hosted (Java) | Netflix (original gateway, replaced by Envoy) |

## Related Concepts
- [Rate Limiting](../rate-limiting.md) — often implemented at the gateway layer
- [Load Balancing](./load-balancing.md) — gateway distributes traffic across service instances
- [CDN](./cdn.md) — CDN can act as a "gateway" for static assets and cached responses
- [Monitoring and Observability](../monitoring-and-observability.md) — gateway is the best place to capture request metrics
