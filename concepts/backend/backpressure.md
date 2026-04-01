# Backpressure

**What**: The condition that occurs when a producer generates data faster than a consumer can process it, causing pressure to build up in the system. The term is also used loosely to describe the strategies for *handling* this condition (flow control, rate limiting, load shedding).

**When it arises**: Any system where production and consumption rates can diverge — streaming, message queues, pipelines, network I/O, file processing.

**Tradeoffs**: Handling backpressure adds complexity, reduces peak throughput, and can introduce latency spikes — but ignoring it leads to OOM crashes or silent data loss.

> **OOM (Out Of Memory)**: The process allocates more memory than is available — the OS kills it (Linux's OOM killer) or the runtime throws (Java `OutOfMemoryError`, Node.js heap limit). In the backpressure context, this happens when a fast producer fills an unbounded buffer faster than the consumer drains it.


## The Problem

Without backpressure, a fast producer and slow consumer leads to one of two outcomes:

```
Producer (1000 msg/s) ──▶ Buffer ──▶ Consumer (100 msg/s)

Outcome 1: Unbounded buffering → OOM crash
  Buffer: [███████████████████████████████...] → 💥 memory exhausted

Outcome 2: Dropping data → silent data loss
  Buffer: [██ full ██] → new messages discarded silently
```

Backpressure is the third option: **tell the producer to slow down**.

```
Outcome 3: Backpressure → producer slows to consumer's pace
  Consumer → "I'm full" → Producer pauses/slows
  Buffer stays bounded, no data loss, no crash
```

## How It Works

### Strategy 1: Stop Reading (Transport-Level)

The consumer stops reading from the connection. The kernel's receive buffer fills up. TCP flow control kicks in — the sender's writes start blocking or returning "would block."

This is how **TCP flow control** works natively:
- Receiver advertises a **window size** (how many bytes it can accept)
- As the receiver's buffer fills, window shrinks → sender slows down
- Window hits 0 → sender stops completely
- Receiver processes data, window opens → sender resumes

```
Sender                         Receiver
  │── data (1KB) ──────────▶│  window: 4KB → 3KB
  │── data (1KB) ──────────▶│  window: 3KB → 2KB
  │── data (1KB) ──────────▶│  window: 2KB → 1KB
  │── data (1KB) ──────────▶│  window: 1KB → 0KB
  │   (sender blocks)        │  (receiver processing...)
  │                           │  window: 0KB → 4KB
  │◀── window update ────────│
  │── data (1KB) ──────────▶│  (resumes)
```

**HTTP/2 and gRPC** add a second layer — **stream-level flow control** on top of TCP. Each multiplexed stream has its own window, so one slow stream doesn't stall others (though TCP-level HOL blocking can still affect all streams — this is what HTTP/3/QUIC fixes).

### Strategy 2: Explicit Signaling (Application-Level)

Consumer explicitly tells producer to pause/resume, or producer checks before sending.

**Pull-based**: Consumer requests data when ready (instead of producer pushing).
```
Consumer ── "give me 10 items" ──▶ Producer
Consumer processes...
Consumer ── "give me 10 more" ──▶ Producer
```
This is how **Reactive Streams** (Java), **Node.js Streams** (`highWaterMark`), and **Kafka consumers** work. The consumer controls the pace.

**Token/credit-based**: Consumer sends credits (permits). Producer can only send when it has credits.
```
Consumer ── "here are 5 credits" ──▶ Producer
Producer sends 5 messages, stops
Consumer ── "3 more credits" ──▶ Producer
```
Used in AMQP (RabbitMQ `prefetch`), Reactive Streams (`request(n)`).

### Strategy 3: Bounded Buffer + Rejection

Buffer has a fixed size. When full, new messages are rejected with an error. Producer decides what to do (retry, drop, slow down).

```
Producer ── msg ──▶ [Buffer: ██ full ██] ──▶ 429 / RESOURCE_EXHAUSTED / BufferOverflowError
Producer retries with backoff, or drops
```

Examples:
- **HTTP 429 Too Many Requests** — server overwhelmed, client backs off
- **gRPC `RESOURCE_EXHAUSTED`** — server-side buffer full
- **Kafka producer**: Buffer full → `BufferExhaustedException` or block until space
- **Node.js Writable streams**: `.write()` returns `false` when internal buffer exceeds `highWaterMark` — caller should stop writing until `'drain'` event

### Strategy 4: Adaptive Rate Limiting

Producer dynamically adjusts send rate based on feedback signals (latency, error rate, queue depth).

- **TCP congestion control** (slow start, AIMD) is essentially this — rate adapts to network conditions
- **Adaptive concurrency limits**: Measure latency per request; when latency rises, reduce concurrency (Netflix's [concurrency-limits](https://github.com/Netflix/concurrency-limits) library)
- **Token bucket with dynamic refill**: Refill rate tied to consumer's processing rate

## Backpressure Across the Stack

| Layer | Mechanism | Signal |
|---|---|---|
| **TCP** | Flow control (window size) | Receiver window → 0 |
| **HTTP/2 / gRPC** | Stream-level flow control | WINDOW_UPDATE frames |
| **QUIC (HTTP/3)** | Per-stream + connection-level flow control | Same as HTTP/2, no TCP HOL blocking |
| **Node.js Streams** | `highWaterMark` / `drain` event | `.write()` returns `false` |
| **Kafka** | Consumer pull + `fetch.max.bytes` | Consumer controls poll rate |
| **RabbitMQ** | `prefetch` count | Consumer acks before getting more |
| **Reactive Streams** | `request(n)` / `Publisher` + `Subscriber` | Subscriber requests N items |
| **gRPC streaming** | HTTP/2 flow control + application-level | Sender blocks on `send()` |
| **WebSocket** | `bufferedAmount` property | Check before sending; if high, pause |
| **SSE** | TCP flow control only | No application-level signal — if client is slow, TCP stalls the server's writes |
| **Message queues** | Queue depth monitoring + autoscaling | Depth exceeds threshold → scale consumers or reject producers |

## Common Patterns

### Pipeline Backpressure

In a multi-stage pipeline, backpressure must propagate backwards through every stage:

```
Stage A (100/s) → Stage B (50/s) → Stage C (200/s)
                       ↑
                   bottleneck

Without backpressure: Buffer between A→B grows unbounded
With backpressure:    B signals A to slow to 50/s. C is fine (faster than B).
```

If any stage doesn't propagate backpressure, the buffer before it becomes the weak point.

### Load Shedding (When Backpressure Isn't Enough)

When the system is overwhelmed beyond what backpressure can handle, **shed load** — intentionally drop or reject work to protect the system.

- **Priority-based**: Drop low-priority requests first (analytics before checkout)
- **LIFO shedding**: Drop oldest queued items (they're likely already timed out on the client)
- **Circuit breaker**: Stop sending to a failing downstream entirely (see [retry-and-backoff.md](../retry-and-backoff.md))

Load shedding is the safety net when backpressure alone can't keep up.

## Anti-Patterns

**Unbounded queues**: `new Queue()` with no size limit. Works in dev, OOMs in prod under load. Always set a max size.

**Ignoring `.write()` return value**: In Node.js, writing to a stream without checking the return value or listening for `'drain'` — producer keeps pushing, internal buffer grows.

**Blocking the event loop**: In single-threaded runtimes (Node.js, browser), a CPU-heavy consumer blocks the event loop, preventing backpressure signals from being processed. The system appears frozen rather than gracefully slowing.

**Retry storms**: A slow consumer rejects messages, producer retries aggressively, making congestion worse. Always use exponential backoff.

## Real-World Examples

- **Node.js `pipe()`**: Automatically handles backpressure — readable stream pauses when writable stream's buffer is full, resumes on `drain`
- **Kafka**: Consumer-driven pull model. Consumer calls `poll()` when ready. `max.poll.records` limits batch size. If consumer falls behind, consumer group rebalances.
- **gRPC streaming**: HTTP/2 flow control. If client stops reading, server's `send()` blocks. Server can check `is_active()` and cancel if client is gone.
- **Envoy proxy**: Circuit breaking with max connections, max pending requests, max retries — all forms of backpressure at the service mesh level
- **Reactive frameworks** (RxJava, Project Reactor, RxJS): `onBackpressureBuffer(maxSize)`, `onBackpressureDrop()`, `onBackpressureLatest()` — explicit strategies as operators
- **Redis Streams**: `XADD` with `MAXLEN` — bounded stream, oldest entries trimmed when limit hit
- **TCP itself**: The original backpressure system. Every TCP connection has had flow control since 1981 (RFC 793).

## Related Concepts

- [`./message-queues.md`](./message-queues.md) — Queue depth monitoring and consumer scaling as backpressure
- [`./transport-mechanisms.md`](./transport-mechanisms.md) — Per-transport backpressure characteristics
- [`./load-balancing.md`](./load-balancing.md) — Distributing load to avoid overwhelming single consumers
- [`../rate-limiting.md`](../rate-limiting.md) — Rate limiting is producer-side backpressure applied at the API boundary
- [`../retry-and-backoff.md`](../retry-and-backoff.md) — Exponential backoff as a form of self-imposed backpressure
- [`../genai/streaming-inference.md`](../genai/streaming-inference.md) — Backpressure when client can't consume LLM tokens fast enough
