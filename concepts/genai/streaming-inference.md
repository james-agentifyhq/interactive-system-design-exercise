# Streaming Inference

**What**: Delivering LLM output token-by-token as it's generated, rather than waiting for the complete response.
**When to use**: User-facing GenAI applications where perceived latency matters (chat, autocomplete, content generation).
**Tradeoffs**: Better UX (lower time-to-first-token) vs more complex client/server implementation and resource management.

## How It Works

Instead of buffering the entire LLM response server-side, tokens are sent to the client as soon as they're generated:

1. Client initiates request with streaming flag enabled
2. Server starts LLM inference and opens a persistent connection
3. Each generated token is immediately sent to client
4. Client renders tokens incrementally
5. Connection closes when generation completes or is cancelled

**Transport mechanisms:**
- **Server-Sent Events (SSE)**: HTTP-based, unidirectional, simple to implement. Standard for OpenAI/Anthropic APIs. Uses `text/event-stream` format with built-in reconnection (`Last-Event-ID`) and the `EventSource` browser API.
- **Raw HTTP streaming**: `fetch()` + `ReadableStream` — parse chunks yourself without SSE's protocol. No auto-reconnect or event framing, but lower overhead.
- **WebSocket**: Bidirectional, allows cancellation messages from client. More complex connection lifecycle (upgrade handshake, ping/pong).
- **gRPC streaming**: Efficient binary protocol with strong typing via protobuf. Best for service-to-service (Copilot backend uses this).
- **Realtime database (Firebase, Supabase)**: Server writes tokens to a DB path, client subscribes. Decouples producer/consumer but adds a hop and per-write cost. Better for chat/collaboration than token-level streaming.

```
Client                  Server                  LLM
  |                       |                      |
  |---request (stream)--->|                      |
  |                       |---start inference--->|
  |                       |<----token 1----------|
  |<---chunk: "The"-------|                      |
  |                       |<----token 2----------|
  |<---chunk: " quick"----|                      |
  |                       |<----token 3----------|
  |<---chunk: " brown"----|                      |
  |---cancel request----->|                      |
  |                       |---stop inference---->|
  |<---stream closed------|                      |
```

**Cancellation**: Critical for autocomplete scenarios where users keep typing. Client must be able to abort in-flight requests. Server should propagate cancellation to LLM engine to free resources immediately.

**Backpressure**: If client can't consume tokens fast enough, server should pause generation or buffer with limits to prevent memory exhaustion.

## Complexity / Performance

**First token latency (TTFT)**: 100-500ms depending on model size and prompt length. This is what users perceive.

**Total latency**: May be same as batch inference, but UX feels faster because of progressive rendering.

**Resource usage**: Streaming holds connections open longer, limiting concurrent requests. Need connection pooling and proper timeout handling.

**Network overhead**: More frequent small payloads vs one large payload. HTTP/2 mitigates with header compression. HTTP/3 (QUIC) further improves this with per-stream loss recovery (no head-of-line blocking), connection migration across network changes, and 0-RTT reconnection.

**Typical metrics:**
- P50 TTFT: <300ms (target for good UX)
- P99 TTFT: <800ms
- Tokens per second: 20-100 depending on model and hardware

## Real-World Examples

**OpenAI API**: SSE streaming via `stream=true` parameter. Returns `data: [DONE]` on completion.

**Anthropic Claude API**: SSE streaming with event types (message_start, content_block_delta, message_stop).

**GitHub Copilot**: WebSocket streaming for autocomplete suggestions with aggressive cancellation when user keeps typing.

**Vercel AI SDK**: Abstraction layer supporting SSE, streaming responses with React hooks for easy client integration.

**vLLM/TGI**: Inference engines with native streaming support, yield tokens as they decode.

**Streaming architectures typically include:**
- Client-side debouncing (300-500ms) before sending requests
- Request deduplication to avoid redundant inference
- Cancellation tokens passed through entire stack
- Connection keep-alive and health checks

## Related Concepts
- `../backend/load-balancing.md` — distributing streaming requests across inference replicas
- `./llm-cost-optimization.md` — why cancellation is critical for cost control
- `./speculative-decoding.md` — techniques to reduce TTFT
- `../caching.md` — can cache prefixes to skip early tokens
- `./semantic-caching.md` — streaming cache hits still need progressive delivery
