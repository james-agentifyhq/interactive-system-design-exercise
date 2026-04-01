# API Design

**What**: Defining the contract between client and server for how to request and receive data over HTTP.

**When to use**: When building any client-server application that needs a stable, documented interface for communication.

**Tradeoffs**: Consistency and developer experience vs. flexibility; strict contracts vs. rapid iteration; backward compatibility vs. clean design.

## How It Works

**REST Conventions**:
- Resources identified by URLs: `/users/123`, `/posts/456/comments`
- HTTP methods map to operations: GET (read), POST (create), PUT/PATCH (update), DELETE (remove)
- Stateless requests with standard status codes

**Request/Response Contracts**:
```json
// Request
GET /api/v1/users?limit=20&cursor=abc123
Headers: Authorization: Bearer token

// Response
{
  "data": [...],
  "pagination": {
    "next_cursor": "xyz789",
    "has_more": true
  },
  "meta": { "total": 1500 }
}
```

**Pagination Strategies**:
- **Offset-based**: `?offset=20&limit=10` - Simple but breaks with concurrent writes
- **Cursor-based**: `?cursor=abc123&limit=10` - Stable, efficient for large datasets, opaque token
- **Page-based**: `?page=3&size=10` - User-friendly but same issues as offset

**Error Codes**:
- 2xx: Success (200 OK, 201 Created, 204 No Content)
- 4xx: Client errors (400 Bad Request, 401 Unauthorized, 404 Not Found, 429 Too Many Requests)
- 5xx: Server errors (500 Internal Server Error, 503 Service Unavailable)

**Versioning**:
- **URL versioning**: `/api/v1/users`, `/api/v2/users` - Explicit, easy to route
- **Header versioning**: `Accept: application/vnd.api.v2+json` - Cleaner URLs but less visible
- **Query param**: `/users?version=2` - Flexible but easy to forget

## Complexity / Performance

**Request Overhead**:
- REST: Multiple round trips for related resources (N+1 problem)
- GraphQL: Single request, client specifies fields (can over-fetch from DB)

**Latency Characteristics**:
- Typical API call: 50-200ms (network + processing)
- Pagination: Cursor > offset for large datasets (no COUNT query)

**Design Considerations**:
- **Filtering**: `?status=active&created_after=2024-01-01`
- **Field selection**: `?fields=id,name,email` to reduce payload size
- **Rate limiting headers**: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Real-World Examples

- **GitHub API**: `/repos/{owner}/{repo}/issues` - RESTful, cursor pagination, versioned via header
- **Stripe API**: Cursor-based pagination, idempotency keys, detailed error codes
- **Twitter API v2**: URL versioning, field selection, comprehensive rate limiting
- **Shopify API**: REST + GraphQL options, webhook notifications, bulk operations
- **AWS APIs**: Action-based (not RESTful), XML/JSON responses, signed requests

## HTTP/3 (QUIC)

HTTP/3 replaces TCP with QUIC (UDP-based). Mainstream as of 2024+ (~30% of web traffic). Key improvements over HTTP/2:

- **No head-of-line blocking**: HTTP/2 multiplexes streams over one TCP connection — a single lost packet stalls all streams. QUIC gives each stream independent loss recovery.
- **Connection migration**: Connections identified by connection ID, not (IP, port). Survives wifi → cellular transitions without reconnection.
- **0-RTT establishment**: Resumed connections can send data immediately (vs TCP+TLS 2-3 round trips).
- **Integrated TLS 1.3**: Encryption built into the protocol, not layered on top.

**Impact on application design**: Transparent — SSE, WebSocket, REST all work unchanged over HTTP/3. The improvements reduce reconnection frequency and improve multiplexed workloads, but don't change API-level design decisions. `EventSource`, `fetch()`, and application code remain identical.

**When it matters most**: Mobile clients (network switching), multiplexed connections (streaming + API calls on same connection), lossy networks.

## Related Concepts

- `./rate-limiting.md` - Protecting APIs from abuse
- `./retry-and-backoff.md` - Handling API failures gracefully
- `./caching.md` - HTTP cache headers (ETag, Cache-Control)
- `./monitoring-and-observability.md` - Tracking API latency and error rates
- `./data-modeling.md` - How backend schemas map to API responses
