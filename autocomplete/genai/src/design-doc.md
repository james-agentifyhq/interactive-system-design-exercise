# GenAI Smart Compose — Design Doc

## Overview

A Gmail Smart Compose-style text completion app powered by an LLM. User types in a textarea, pauses, and ghost text appears with a suggested completion streamed token-by-token via SSE. Tab to accept, keep typing to dismiss. Includes a semantic cache layer using sqlite-vec so similar contexts return cached completions without calling the LLM.

This implements the architecture described in `autocomplete/genai/genai.md` (Pattern 1: Pure Generation with semantic caching). No abstraction libraries hide the SSE or streaming layer — every component in the architecture diagram maps to code we write.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Client (React)                     │
│                                                       │
│  Keystroke → useDebounce (500ms) → useCompletion      │
│                                        │              │
│                              AbortController ←────┐   │
│                                       │           │   │
│              ┌────────────────────────▼─────────┐ │   │
│              │  sse-client.ts                    │ │   │
│              │  fetch POST + ReadableStream      │ │   │
│              │  parse data: lines manually       │ │   │
│              └────────────────┬──────────────────┘ │   │
│                               │ CompletionChunk    │   │
│              ┌────────────────▼──────────────────┐ │   │
│              │  Compose + GhostText              │ │   │
│              │  textarea + gray overlay          │ │   │
│              │  Tab=accept, Escape=dismiss       │ │   │
│              └───────────────────────────────────┘ │   │
│                                                    │   │
│              StatsPanel (tokens, cache hits, cost)  │   │
└───────────── POST /api/complete ───────────────────┘   │
                                │                        │
                    ┌───────────▼───────────┐            │
                    │   Hono API Server     │            │
                    │   (port 3002)         │            │
                    │   CORS, logging       │            │
                    └───────────┬───────────┘            │
                                │                        │
                    ┌───────────▼───────────┐            │
                    │  Completion Service   │            │
                    │  (orchestrator)       │            │
                    │                       │            │
                    │  1. Embed context     │            │
                    │  2. Semantic cache    │            │
                    │     lookup            │            │
                    │                       │            │
                    │  Cache hit?           │            │
                    │  ├─ YES → stream      │            │
                    │  │   cached result    │──SSE──────→│
                    │  │   (instant)        │            │
                    │  │                    │            │
                    │  └─ NO → 3. Build     │            │
                    │     prompt            │            │
                    │     4. Stream from    │            │
                    │     LLM token-by-    │──SSE──────→│
                    │     token             │
                    │     5. Store in cache │
                    │     (fire-and-forget) │
                    └───────────────────────┘
                          │           │
               ┌──────────▼──┐  ┌─────▼──────────┐
               │ Semantic    │  │ OpenRouter (OpenAI SDK)   │
               │ Cache       │  │ (streaming)     │
               │             │  │                 │
               │ Embedder    │  │ Prompt Builder  │
               │ (MiniLM)   │  │ (system prompt) │
               │             │  │                 │
               │ sqlite-vec  │  │ AbortSignal →   │
               │ (vec0)     │  │ stream cancel   │
               └─────────────┘  └─────────────────┘
```

## genai.md → Code Mapping

| genai.md Component | File | Responsibility |
|---|---|---|
| Client (Editor) | `client/src/components/Compose/Compose.tsx` + `GhostText.tsx` | Textarea, ghost text overlay, Tab/Escape |
| — | `client/src/utils/sse-client.ts` | Hand-built SSE parser (fetch + ReadableStream) |
| — | `client/src/hooks/useCompletion.ts` | Debounce → stream → accumulate tokens → accept/dismiss |
| API Gateway | `server/src/index.ts` | CORS, logging, POST /api/complete, validation |
| Completion Service | `server/src/completion/completion-service.ts` | Orchestrator: cache check → LLM → cache store |
| Semantic Cache | `server/src/cache/semantic-cache.ts` | sqlite-vec similarity search, store/lookup |
| — (embedding) | `server/src/cache/embedder.ts` | @xenova/transformers, all-MiniLM-L6-v2, 384-dim |
| Prompt Builder | `server/src/llm/prompt-builder.ts` | System prompt for sentence completion |
| LLM (streaming) | `server/src/llm/openrouter-client.ts` | OpenRouter (OpenAI SDK) streaming + cancellation |
| SSE transport | `server/src/sse/sse-response.ts` | Hand-built text/event-stream via ReadableStream |

## Data Flow

### Normal flow (cache miss)
1. User types → 500ms debounce pause → `useCompletion` triggers
2. Abort any previous in-flight stream (`AbortController`)
3. `fetch POST /api/complete` with `{ context: { textBefore, textAfter } }`
4. Server `CompletionService` embeds context → searches sqlite-vec → cache miss
5. `PromptBuilder` constructs system + user message
6. `OpenRouterClient` calls `chat.completions.create({ stream: true })` → async generator yields tokens
7. Each token formatted as `data: {"text":"...","done":false}\n\n` via `sse-response.ts`
8. Client `sse-client.ts` reads `ReadableStream`, parses `data:` lines, yields `CompletionChunk`
9. `useCompletion` accumulates `suggestion` state → `GhostText` renders gray text
10. On stream complete → fire-and-forget cache store (embed + sqlite-vec insert)

### Cache hit flow
1-4 same as above, but sqlite-vec returns a similar embedding (cosine > 0.92)
5. Cached completion returned as single SSE event (instant, no LLM call)
6. Client sees full suggestion appear at once — noticeably faster

### Cancellation flow
1. User types while stream is active → `useCompletion` effect cleanup fires
2. `AbortController.abort()` → fetch aborts → server receives abort signal
3. Server propagates `AbortSignal` to OpenAI SDK → stops LLM inference
4. GPU resources freed immediately (unlike traditional autocomplete where aborting is optional)

## File Structure

```
genai/src/
├── design-doc.md
├── README.md
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                    # Hono app, routes (port 3002)
│       ├── types.ts                    # CompletionRequest, CompletionChunk
│       ├── completion/
│       │   └── completion-service.ts   # Orchestrator
│       ├── cache/
│       │   ├── semantic-cache.ts       # sqlite-vec store + similarity search
│       │   └── embedder.ts             # @xenova/transformers wrapper
│       ├── llm/
│       │   ├── openrouter-client.ts     # Streaming + cancellation
│       │   └── prompt-builder.ts       # System prompt
│       └── sse/
│           └── sse-response.ts         # Hand-built SSE formatting
│
└── client/
    ├── package.json
    ├── vite.config.ts                  # Port 5174, proxy → 3002
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── types.ts
        ├── hooks/
        │   ├── useDebounce.ts          # Copied from fullstack
        │   └── useCompletion.ts        # SSE stream consumption
        ├── components/Compose/
        │   ├── Compose.tsx             # Textarea + ghost text + keyboard
        │   ├── GhostText.tsx           # Gray overlay
        │   ├── StatsPanel.tsx          # Tokens, cache, latency, cost
        │   ├── compose.css
        │   └── index.ts
        └── utils/
            └── sse-client.ts           # fetch + ReadableStream SSE parser
```

## Key Design Decisions

**Hand-built SSE** — No Hono SSE helper, no EventSource API, no Vercel AI SDK. Server constructs `text/event-stream` response via raw `ReadableStream`. Client parses `data:` lines manually via `fetch()` + `ReadableStream.getReader()`. This is because: (a) `EventSource` only supports GET, we need POST with JSON body; (b) the point of this demo is to show the SSE mechanics, not hide them.

**Cache hit = instant delivery** — When semantic cache hits, the full completion is sent as one SSE event, not simulated token-by-token. Makes the difference between cached and uncached responses obvious and demonstrates the value of caching.

**Fire-and-forget cache store** — After streaming completes, the completion is stored in the semantic cache asynchronously. The response is already sent — we don't block on cache writes.

**Similarity threshold 0.92** — High to avoid returning wrong completions for similar-but-different contexts. Can be tuned down if hit rate is too low.

**Local embeddings** — `@xenova/transformers` runs `all-MiniLM-L6-v2` (384-dim) in Node.js on CPU. No second API key needed. ~80ms per embedding, free.

**sqlite-vec in-memory** — For the demo, `:memory:` is fine. Can pass a file path for persistence across restarts.

**500ms debounce** — Longer than the 300ms used in the traditional autocomplete. GenAI completions are more expensive (LLM cost) and take longer (200ms+ TTFT), so we want to be more certain the user has paused before triggering.

## Lessons Learned: Debouncing + Streaming Pitfalls

Building this demo exposed several non-obvious interactions between debouncing, streaming, and React state that don't appear in traditional autocomplete. These are the kind of issues that come up in real system design interviews when discussing trade-offs.

### Problem 1: Eager dismiss kills ghost text

**What happened**: The user types, pauses, ghost text appears for a split second, then vanishes.

**Root cause**: `handleChange` in the Compose component called `dismiss()` (which clears the suggestion) on every keystroke. With streaming, the timeline is:
1. User stops typing → debounce fires → LLM stream starts → tokens arrive → ghost text renders
2. User types one more character → `handleChange` fires → `dismiss()` → suggestion cleared
3. But the debounce timer also resets → new stream starts 500ms later → `setSuggestion('')` at the start of the new effect

The suggestion only lived between "tokens arrive" and "next keystroke" — a few hundred milliseconds at best.

**Fix**: Remove the eager `dismiss()` from `handleChange`. The `useEffect` cleanup already aborts the previous stream when `debouncedText` changes, and the new effect clears the suggestion. Typing naturally dismisses via the debounce cycle.

**Lesson**: With streaming, dismiss-on-keystroke is too aggressive. Traditional autocomplete (JSON response, dropdown) can dismiss instantly because the next result arrives in one shot. With token-by-token streaming, the suggestion needs to persist until the next debounce cycle starts, or the user will never see it.

### Problem 2: Request flood from debounce + free-tier rate limits

**What happened**: The app fired dozens of requests per minute, quickly exhausting the free-tier rate limit (8 req/min on Llama 3.3 70B).

**Root cause**: The 500ms debounce fires after every pause, even brief ones mid-word. With a slow LLM (1-3s response), most requests get aborted before they complete, but they still count against the rate limit.

**Insight**: Traditional autocomplete backends are cheap (~$0.000001/query, 10ms response) so a request flood is harmless. LLM backends are ~10,000x more expensive and have strict rate limits. The debounce delay is a critical cost control lever, not just a UX concern.

### Problem 3: `openrouter/free` router picks incompatible models

**What happened**: The free model router sometimes picks "thinking" models (e.g., `liquid/lfm-2.5-1.2b-thinking`) that stream chunks with `delta.role` but no `delta.content`. The stream completes with 0 tokens yielded.

**Lesson**: When using a model router, your streaming parser must handle models with different chunk formats gracefully. A completion with 0 useful tokens should be treated as a no-op, not shown as an empty suggestion.

## Comparison with Traditional (fullstack)

| Aspect | Traditional (fullstack) | GenAI (this) |
|---|---|---|
| Data source | Static dataset (Trie) | LLM generation |
| Response format | JSON (all at once) | SSE (token-by-token streaming) |
| Cache strategy | Exact match (LRU, query string key) | Semantic similarity (embedding + sqlite-vec) |
| Client cache | Normalized (id → result) | None needed (suggestions are ephemeral) |
| Trigger delay | 300ms debounce | 500ms debounce |
| Cancellation | AbortController (optional, cheap) | AbortController (critical, saves GPU/cost) |
| Cost per query | ~$0.000001 (CPU) | ~$0.001-0.01 (LLM API) |
| UI pattern | Dropdown list | Inline ghost text |

## Dependencies

### Server
- `hono` + `@hono/node-server` — HTTP framework
- `openai` — OpenAI-compatible SDK (pointed at OpenRouter)
- `dotenv` — .env file loading
- `@xenova/transformers` — local embeddings
- `better-sqlite3` + `sqlite-vec` — vector storage
- `tsx` — TypeScript execution
- `vitest` — testing

### Client
- `react` + `react-dom` — UI
- `vite` + `@vitejs/plugin-react` — dev server + build
- `typescript` — types
