# Transport Mechanisms

**What**: The protocols and patterns for moving data between entities (client↔server, service↔service) over a network. Choosing the right transport shapes latency, complexity, and scalability.

**When to use**: Every networked system — the question is *which* mechanism, not whether you need one.

**Tradeoffs**: Simplicity vs bidirectionality; latency vs decoupling; browser support vs protocol efficiency; standardization vs flexibility.

## Taxonomy

| Category | Direction | Mechanisms |
|---|---|---|
| **Request-Response** | Client → Server → Client | HTTP (REST), GraphQL (query/mutation), gRPC unary |
| **Client → Server Streaming** | Client → Server | gRPC client streaming |
| **Server → Client Streaming** | Server → Client | SSE, raw HTTP streaming, gRPC server streaming |
| **Peer-to-Peer** | Peer ↔ Peer (after signaling) | WebRTC (media tracks + data channels) |
| **Bidirectional** | Both, simultaneously | WebSocket, WebTransport, gRPC bidi streaming, GraphQL subscriptions (over WS) |
| **Simulated Push** | Server → Client (via held request) | Long polling |
| **Server → Server Callback** | Producer → Consumer (inverted HTTP) | Webhooks |
| **Pub/Sub** | Producer → Broker → Consumers | Message queues, realtime databases, MQTT |

## Foundation: TCP vs UDP

Everything above runs on top of one of these two transport-layer protocols. The choice between them explains most of the performance characteristics of higher-level protocols.

### TCP (Transmission Control Protocol)

Reliable, ordered byte stream. The foundation for HTTP/1.1, HTTP/2, WebSocket, gRPC, MQTT.

- **3-way handshake**: SYN → SYN-ACK → ACK before any data flows (1 round trip). Add TLS handshake for HTTPS (another 1-2 round trips). Total: 2-3 RTTs before first byte.
- **Reliable delivery**: Every byte is acknowledged. Lost packets are retransmitted. Receiver gets data in order.
- **Congestion control**: Slow start, ramps up throughput. Backs off on packet loss.
- **Head-of-line (HOL) blocking**: TCP guarantees in-order delivery of its *single byte stream*. If packet #3 is lost, packets #4 and #5 (already received) wait in the kernel buffer until #3 is retransmitted and arrives. The application sees nothing until the gap is filled.

```
TCP stream (single ordered pipe):
  Packet: [1] [2] [_3 lost_] [4] [5]
                      ↑
  Receiver has 4 and 5, but app is blocked waiting for 3.
  Even if 4 and 5 belong to a completely unrelated HTTP request.
```

### UDP (User Datagram Protocol)

Unreliable, unordered individual datagrams. The foundation for QUIC (HTTP/3), WebRTC, DNS, game servers.

- **No handshake**: Send immediately. No connection setup overhead.
- **No ordering or retransmission**: Packets can arrive out of order, duplicated, or not at all. The application decides what to do.
- **No HOL blocking**: Since there's no ordering guarantee, one lost packet doesn't stall anything.
- **Smaller header**: 8 bytes (vs TCP's 20+ bytes).

By itself, UDP is too raw for most applications — you lose reliability, ordering, and congestion control. But it lets you build *exactly the guarantees you need* on top.

### How HTTP/3 (QUIC) Solved HOL Blocking

HTTP/2 multiplexes multiple streams (requests) over **one TCP connection**. This is great for reducing connection overhead, but it inherits TCP's HOL blocking — a lost packet on *any* stream stalls *all* streams.

QUIC builds its own reliability layer on top of UDP, with **per-stream ordering**:

```
HTTP/2 over TCP (shared fate):
  TCP stream:  [Stream A pkt] [Stream B pkt] [Stream A pkt LOST] [Stream B pkt]
                                                    ↑
                                          Stream B blocked waiting for Stream A's retransmit

HTTP/3 over QUIC/UDP (independent streams):
  Stream A:  [pkt 1] [pkt 2 LOST] [pkt 3]  ← only Stream A waits for retransmit
  Stream B:  [pkt 1] [pkt 2] [pkt 3]       ← Stream B flows normally
```

QUIC also adds:
- **0-RTT connection resumption**: Clients cache crypto state, send data on first packet (vs TCP+TLS = 2-3 RTTs)
- **Connection migration**: Identified by connection ID (not IP+port tuple), so wifi → cellular doesn't break the connection
- **Integrated encryption**: TLS 1.3 baked in — no unencrypted QUIC

**Practical impact**: On a reliable network (datacenter, wired), HTTP/2 and HTTP/3 perform similarly. On lossy/mobile networks (2-5% packet loss), HTTP/3 can be significantly faster because one lost packet doesn't cascade across all streams.

## Request-Response (Client → Server → Client)

### HTTP (REST / JSON-RPC)

The default. Client sends a request, server sends one response, connection is done.

- **HTTP/1.1**: One request per TCP connection (or pipelined, poorly supported). `Connection: keep-alive` reuses TCP. Browsers open 6 parallel connections per domain to work around this.
- **HTTP/2**: Multiplexed streams over one TCP connection. Header compression (HPACK). Binary framing. Solves HTTP-level HOL blocking but inherits TCP-level HOL blocking.
- **HTTP/3 (QUIC)**: Multiplexed streams over UDP (QUIC). Per-stream loss recovery — no HOL blocking at any layer. Connection migration. 0-RTT reconnection.

**When to use**: CRUD APIs, form submissions, any request with a single discrete response.
**Limitation**: One response per request. Not suited for ongoing data flow.

### REST vs GraphQL

Both run over HTTP, but differ in how the client specifies what data it wants.

**REST**: Resource-oriented. Each endpoint returns a fixed shape. Client makes multiple requests to assemble related data.
```
GET /users/123          → { id, name, email, avatarUrl, ... }
GET /users/123/posts    → [{ id, title, ... }, ...]
GET /posts/456/comments → [{ id, body, ... }, ...]
```

**GraphQL**: Query-oriented. Single endpoint, client specifies the exact fields and relationships in one request.
```graphql
query {
  user(id: 123) {
    name
    posts(first: 5) {
      title
      comments { body }
    }
  }
}
```

| | REST | GraphQL |
|---|---|---|
| Endpoints | Many (one per resource) | One (`/graphql`) |
| Data fetching | Server decides shape; client may over-fetch or under-fetch | Client specifies exact fields; no over/under-fetch |
| N+1 problem | Client-side (multiple round trips) | Server-side (resolver fan-out, solved with DataLoader) |
| Caching | HTTP caching works naturally (GET + URL = cache key) | Harder — POST body varies, need normalized client cache (Apollo, urql) |
| File upload | Native (`multipart/form-data`) | Awkward (spec exists but not standard) |
| Real-time | Pair with SSE or WebSocket separately | Built-in subscriptions (typically over WebSocket) |
| Tooling | curl, any HTTP client | Needs GraphQL client; but gets schema introspection, type generation |
| Learning curve | Low | Medium (schema design, resolvers, N+1 awareness) |

**GraphQL Subscriptions**: GraphQL's native real-time mechanism. Client subscribes to a query; server pushes updates when data changes. Usually runs over WebSocket (graphql-ws protocol).
```graphql
subscription {
  messageAdded(channelId: "general") {
    text
    sender { name }
  }
}
```

**When to use REST**: Public APIs, simple CRUD, when HTTP caching matters, when clients are diverse (mobile, third-party).
**When to use GraphQL**: Complex client data requirements, multiple frontend clients needing different shapes, rapid frontend iteration without backend changes.
**Not either/or**: Many systems use both — REST for simple/public endpoints, GraphQL for complex client-facing queries (GitHub, Shopify).

### gRPC (Unary)

RPC framework over HTTP/2 with protobuf serialization. Client calls a method, server returns one response.

- Binary encoding — smaller payloads, faster parsing than JSON
- Strong typing via `.proto` schema — codegen for client/server stubs
- Built-in deadlines, cancellation, metadata headers

**When to use**: Service-to-service communication where latency and type safety matter.
**Limitation**: No native browser support (needs grpc-web proxy). Protobuf adds a build step.

## Server → Client Streaming

### Server-Sent Events (SSE)

Unidirectional stream over HTTP. Server sends `text/event-stream` content; client uses `EventSource` API.

```
Client                         Server
  │── GET /stream ────────────▶│
  │◀── data: {"token":"The"}───│
  │◀── data: {"token":"end"}───│
  │◀── (connection held open)──│
```

- Built-in reconnection with `Last-Event-ID`
- Named event types (`event: update`)
- Works through HTTP proxies, CDNs, load balancers
- Browser-native `EventSource` API — trivial client code

**When to use**: LLM token streaming, live feeds, notifications — anything unidirectional.
**Limitation**: Unidirectional only. Max ~6 connections per domain in HTTP/1.1 (not an issue over HTTP/2+). Text-based (no binary).

### Raw HTTP Streaming

`fetch()` with `ReadableStream` — parse chunks yourself without SSE's protocol.

- No `EventSource` API, no auto-reconnect, no event framing
- Lighter overhead — no `data:` prefix, no newline delimiters
- Can stream binary data (images, audio)
- Works over HTTP/2 and HTTP/3

**When to use**: When SSE's framing overhead matters, or when streaming binary data.
**Limitation**: You reimplement reconnection, event parsing, and error handling yourself.

### gRPC Server Streaming

Server returns a stream of protobuf messages in response to one client request.

- Multiplexed over HTTP/2 — multiple streams on one connection
- Backpressure via HTTP/2 flow control
- Strong typing on each streamed message

**When to use**: Service-to-service streaming (metrics feeds, change streams, log tailing).

## Bidirectional

### WebSocket

Full-duplex communication channel over a single TCP connection. Starts as HTTP upgrade, then switches to WebSocket framing.

```
Client                         Server
  │── HTTP Upgrade ───────────▶│
  │◀── 101 Switching ──────────│
  │◀──▶ frames (both ways) ◀──▶│
```

- True bidirectional — either side can send at any time
- Low overhead per message (2-14 byte frame header vs HTTP headers)
- No built-in reconnection — you implement it (or use Socket.IO, which adds reconnect + rooms + fallback)

**When to use**: Chat, multiplayer games, collaborative editing, real-time dashboards where client also sends data.
**Limitation**: Stateful connection — harder to load balance (sticky sessions or connection-aware routing). Doesn't go through some corporate proxies. No multiplexing (one logical channel per connection, unless you frame your own).

### WebTransport

HTTP/3-native bidirectional transport. Provides both reliable streams and unreliable datagrams over QUIC.

- Multiple independent streams on one connection (no head-of-line blocking)
- Unreliable datagrams for latency-sensitive data (game state, video frames)
- No upgrade handshake — uses HTTP/3 CONNECT
- Session-level and stream-level APIs

**When to use**: Real-time applications that need both reliable and unreliable channels — gaming, live video, AR/VR.
**Limitation**: Newer — browser support is growing but not universal. More complex API than WebSocket. Requires HTTP/3-capable server.

### gRPC Bidirectional Streaming

Both client and server send streams of messages independently.

- Each side reads and writes independently — not request/response
- Built-in flow control, cancellation, deadlines
- Protobuf-typed on both directions

**When to use**: Service-to-service real-time data exchange (distributed training, live pipelines).

## Long Polling

Client sends a request; server holds it open until there's data (or timeout), then responds. Client immediately reconnects.

```
Client                         Server
  │── GET /updates?since=42 ──▶│
  │        (server waits...)    │
  │◀── 200 [{new data}] ───────│  ← responds when data available
  │── GET /updates?since=43 ──▶│  ← client reconnects immediately
```

- Works everywhere — plain HTTP, no special protocol
- Simple to implement server-side (hold the request in memory)
- Higher latency than persistent connections (reconnection gap)
- More overhead than SSE (full HTTP headers on each reconnect)

**When to use**: When SSE/WebSocket aren't available (legacy environments, restrictive proxies). Polling-based systems where near-real-time is good enough.

## Webhooks

Server-to-server push via HTTP callback. Service A sends an HTTP POST to service B's pre-registered URL when an event occurs. The roles invert — the event *producer* is the HTTP client.

```
Registration:
B ── POST /webhook-config {"url": "https://b.com/callback"} ──▶ A

Later, when event occurs:
A ── POST https://b.com/callback {"event": "payment.success", ...} ──▶ B
B ── 200 OK ──▶ A
```

- Plain HTTP — works everywhere, no special protocol or persistent connection
- Producer defines the event schema; consumer hosts an endpoint
- **Verification**: Producer signs the payload with HMAC (shared secret). Consumer verifies the signature to prevent spoofed requests. (Stripe: `Stripe-Signature` header. GitHub: `X-Hub-Signature-256`.)
- **Retry with backoff**: If the consumer returns non-2xx or times out, the producer retries with exponential backoff (Stripe retries for 3 days, GitHub for 3 days)
- **Idempotency**: Events can be delivered more than once — consumer must deduplicate by event ID
- **Ordering**: Events may arrive out of order — use timestamps or sequence numbers, not arrival order
- **Fan-out**: One event can trigger webhooks to multiple registered URLs

**When to use**: Third-party integrations (payment notifications, CI/CD triggers, CMS updates), any case where service B needs to react to events in service A without polling.
**Limitation**: Consumer must be publicly reachable (problematic for local dev — tools like ngrok bridge this). No built-in delivery guarantee beyond retries. Consumer downtime means queued retries on the producer side, with eventual expiry.

## Pub/Sub via Realtime Database

Server writes to a database path; client subscribes and receives push updates. The database handles the transport.

- **Firebase RTDB**: JSON tree, `onValue()` listener, WebSocket under the hood
- **Firestore**: Document-based, `onSnapshot()`, supports offline persistence
- **Supabase Realtime**: Postgres changes broadcast via WebSocket (CDC)
- **Convex**: Reactive queries — client subscribes to a query, gets updates when results change

**When to use**: When you want decoupled producers/consumers with built-in persistence, offline support, and conflict resolution. Chat, collaborative state, presence indicators.
**Limitation**: Extra hop (server → DB → client) adds latency. Per-operation pricing can be expensive at high write frequency (e.g., token-by-token LLM streaming into Firebase). You're coupling transport to a specific vendor.

## Pub/Sub via Message Broker

Producers publish to topics/channels; consumers subscribe. The broker handles delivery, ordering, and durability.

- Kafka, RabbitMQ, Redis Pub/Sub, NATS, AWS SNS/SQS, Google Pub/Sub
- See [message-queues.md](./message-queues.md) for deep dive

**When to use**: Service-to-service async communication, event-driven architectures, fan-out.
**Limitation**: Not directly exposed to browser clients (needs a gateway or WebSocket bridge).

## Specialized Protocols

### WebRTC

Peer-to-peer real-time communication. Originally designed for video/audio calls in the browser, but also provides data channels for arbitrary P2P data.

```
Peer A                   Signaling Server                   Peer B
  │── offer (SDP) ─────────▶│                                  │
  │                          │── forward offer ────────────────▶│
  │                          │◀── answer (SDP) ─────────────────│
  │◀── forward answer ───────│                                  │
  │                          │                                  │
  │◀═══════ direct P2P media/data (SRTP/SCTP over UDP) ═══════▶│
```

- **Peer-to-peer**: After signaling, data flows directly between peers — no server relay (unless NAT traversal fails, then TURN server relays)
- **Signaling**: Peers exchange SDP offers/answers via *any* transport (WebSocket, HTTP, even carrier pigeon). WebRTC doesn't define the signaling protocol — you choose.
- **ICE/STUN/TURN**: NAT traversal framework. STUN discovers public IP; TURN relays traffic when direct P2P fails (~15-20% of connections need TURN)
- **Media tracks**: Audio/video streams with codec negotiation (VP8/VP9/H.264/AV1, Opus)
- **Data channels**: Arbitrary binary/text data, reliable or unreliable (configurable), ordered or unordered. Built on SCTP over DTLS over UDP.
- **Encryption**: Mandatory — DTLS for data channels, SRTP for media. No unencrypted option.

**When to use**: Video/audio calls, screen sharing, P2P file transfer, low-latency gaming (data channels), any case where server relay is undesirable (bandwidth cost, privacy).
**Limitation**: Complex setup (ICE, STUN, TURN infrastructure). Scaling beyond P2P requires an SFU (Selective Forwarding Unit) for group calls. No built-in persistence or message history. Browser API is notoriously complex.

**SFU vs MCU for group calls**:
- **SFU** (Selective Forwarding Unit): Each peer sends one stream to the server; server forwards selectively to other peers. Low server CPU, scales to ~50 participants. (Jitsi, mediasoup, LiveKit)
- **MCU** (Multipoint Control Unit): Server decodes all streams, mixes them into one, sends back. High server CPU, simpler for clients. Rare now.

### MQTT

Lightweight pub/sub protocol designed for constrained devices and unreliable networks. The standard for IoT messaging.

```
Sensor ── PUBLISH "home/temp" 22.5 ──▶ MQTT Broker ──▶ Dashboard (subscribed to "home/#")
                                              │
                                              └──▶ Logger (subscribed to "#")
```

- **Pub/Sub over TCP** (or WebSocket for browser clients): Publishers and subscribers are fully decoupled via a broker
- **Topic hierarchy**: Slash-delimited paths (`home/living-room/temp`). Wildcards: `+` (single level), `#` (multi-level)
- **QoS levels**:
  - QoS 0: At most once (fire and forget) — lowest overhead
  - QoS 1: At least once (acknowledged) — may duplicate
  - QoS 2: Exactly once (4-step handshake) — highest overhead
- **Retained messages**: Broker stores the last message per topic. New subscribers immediately get the current state.
- **Last Will and Testament (LWT)**: Broker publishes a pre-configured message if a client disconnects unexpectedly (device offline detection)
- **Tiny overhead**: 2-byte minimum header. Designed for bandwidth-constrained links (satellite, cellular IoT)
- **MQTT 5.0** adds: shared subscriptions (load balancing), message expiry, request/response pattern, user properties

**When to use**: IoT sensor networks, home automation, fleet tracking, any scenario with many low-power devices publishing small messages over unreliable networks.
**Limitation**: Not designed for large payloads or request-response patterns (though MQTT 5 adds correlation IDs). Broker is a single point of failure (cluster for HA). No built-in message history (pair with a time-series DB).

**Popular brokers**: Mosquitto (lightweight, single-node), EMQX (clustered, millions of connections), HiveMQ (enterprise), AWS IoT Core (managed).

### Other Specialized Protocols

**AMQP** (Advanced Message Queuing Protocol): Wire-level protocol for message brokers. More feature-rich than MQTT — routing rules, exchanges, bindings. RabbitMQ's native protocol. See [message-queues.md](./message-queues.md).

**CoAP** (Constrained Application Protocol): REST-like (GET/PUT/POST/DELETE) but over UDP, for extremely constrained IoT devices. Even lighter than MQTT. Supports observe pattern (like subscriptions).

**NATS**: Ultra-lightweight pub/sub + request/reply. Single binary, no dependencies. Core NATS is at-most-once; JetStream adds persistence and exactly-once. Popular in cloud-native / Kubernetes service meshes.

**ZeroMQ** (ØMQ): Embeddable messaging library (not a broker). Gives you socket-like API with pub/sub, push/pull, request/reply patterns. No broker needed — peers connect directly. Used in distributed computing (Jupyter kernels use ZMQ).

**Socket.IO**: Not a protocol — a library on top of WebSocket that adds: auto-reconnection, rooms/namespaces, fallback to long polling, binary support, acknowledgements. Useful when you want WebSocket semantics with less boilerplate. Has server (Node.js, Python, Java, Go) and client (browser, iOS, Android) implementations.

## Comparison Matrix

| Mechanism | Direction | Multiplexed | Browser | Binary | Auto-reconnect | Typical latency |
|---|---|---|---|---|---|---|
| HTTP (REST) | Req → Res | HTTP/2+ | Yes | No* | N/A | 50-200ms |
| GraphQL | Req → Res (query/mutation); Server → Client (subscription) | HTTP/2+ | Yes | No* | N/A (subscriptions: WS reconnect) | 50-200ms |
| SSE | Server → Client | HTTP/2+ | Yes (`EventSource`) | No | Yes | ~0ms (held open) |
| Raw HTTP stream | Server → Client | HTTP/2+ | Yes (`fetch`) | Yes | No | ~0ms (held open) |
| WebSocket | Bidirectional | No | Yes | Yes | No (manual) | ~0ms (held open) |
| WebTransport | Bidirectional | Yes (QUIC) | Growing | Yes | Configurable | ~0ms (held open) |
| Long polling | Simulated push | No | Yes | No* | Manual | 0-30s (poll gap) |
| gRPC (unary) | Req → Res | HTTP/2 | grpc-web | Yes (protobuf) | N/A | 10-50ms |
| gRPC (streaming) | Any direction | HTTP/2 | grpc-web | Yes (protobuf) | No | ~0ms (held open) |
| Webhook | Server → Server | No | No (S2S) | No* | Retry w/ backoff | Event-driven |
| Realtime DB | Server → Client | Varies | Yes (SDK) | No | Yes (SDK) | 50-200ms |
| WebRTC | Peer ↔ Peer | No (per-peer) | Yes | Yes | ICE restart | <50ms (P2P) |
| MQTT | Pub/Sub | N/A | Via WebSocket | Yes | Yes (clean session) | 10-100ms |
| Message broker | Pub/Sub | N/A | No (needs bridge) | Yes | N/A | 1-100ms |

*\* JSON is text, but HTTP can carry binary bodies*

## Decision Guide

**"I need to fetch data once"** → HTTP (REST) / gRPC unary

**"Multiple frontends need different data shapes from the same API"** → GraphQL

**"Server needs to push updates to browser"** → SSE (simple) or WebSocket (if client also sends)

**"I'm streaming LLM tokens"** → SSE. Raw HTTP stream if you need less overhead.

**"Multiplayer / collaborative editing"** → WebSocket or WebTransport. Consider CRDTs on top.

**"Service-to-service streaming"** → gRPC streaming (typed, multiplexed, flow-controlled)

**"I need unreliable + reliable channels"** → WebTransport

**"Decouple services async"** → Message broker (Kafka, SQS, etc.)

**"I want persistence + real-time for client"** → Realtime database (Firebase, Supabase)

**"Third-party needs to notify my server of events"** → Webhooks (payment callbacks, CI triggers, CMS updates)

**"Video/audio calls or P2P data"** → WebRTC (with SFU for group calls)

**"IoT devices publishing sensor data"** → MQTT (lightweight, QoS levels, LWT for offline detection)

**"Hostile network environment (proxies, firewalls)"** → SSE or long polling (plain HTTP survives everything)

## Real-World Examples

- **OpenAI / Anthropic APIs**: SSE for token streaming
- **Slack**: WebSocket for real-time messages, HTTP for API, message queues (RabbitMQ) internally
- **Discord**: WebSocket (gateway) for real-time, HTTP for REST API, gRPC for service-to-service
- **Google Docs**: WebSocket for OT (operational transform) collaboration
- **Figma**: WebSocket for multiplayer cursors and edits
- **GitHub Copilot**: WebSocket to editor, gRPC internally between services
- **Firebase apps**: Realtime DB / Firestore subscriptions for live state
- **Stripe / GitHub / Shopify**: Webhooks for event notifications to integrators
- **Zoom / Google Meet**: WebRTC for media, WebSocket for signaling, SFU for group calls
- **Tesla / connected cars**: MQTT for vehicle telemetry to cloud
- **Home Assistant**: MQTT for smart home device communication
- **Jupyter**: ZeroMQ for kernel ↔ frontend communication
- **Uber**: gRPC for service mesh, Kafka for event streaming, WebSocket for rider/driver updates

## Related Concepts

- [`./message-queues.md`](./message-queues.md) — Deep dive on async messaging (Kafka, RabbitMQ, SQS)
- [`./api-gateway.md`](./api-gateway.md) — Gateway that terminates and routes these transports
- [`./load-balancing.md`](./load-balancing.md) — Stateful connections (WebSocket) need sticky sessions or connection-aware LB
- [`../api-design.md`](../api-design.md) — HTTP API design patterns, HTTP/3 section
- [`../genai/streaming-inference.md`](../genai/streaming-inference.md) — Streaming transports for LLM inference
- [`./backpressure.md`](./backpressure.md) — How slow consumers signal fast producers to slow down
- [`../frontend/race-conditions.md`](../frontend/race-conditions.md) — Managing concurrent responses from streaming transports
