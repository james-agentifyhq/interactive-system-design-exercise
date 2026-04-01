# GenAI Smart Compose Demo

A Gmail Smart Compose-style text completion app. Type in a textarea, pause, and an LLM-generated suggestion appears as gray ghost text. Tab to accept, Escape or keep typing to dismiss. Includes a semantic cache layer — similar inputs return cached completions without calling the LLM.

Implements the architecture from [`genai/genai.md`](../genai.md). See [`design-doc.md`](./design-doc.md) for the full architecture-to-code mapping.

## Prerequisites

- Node.js 20+
- pnpm
- OpenRouter API key (free):
  1. Go to https://openrouter.ai and sign in (Google/GitHub/email)
  2. Navigate to https://openrouter.ai/keys
  3. Click **Create Key**, give it a name, and copy the key (`sk-or-...`)
  4. No credit card or credits needed — the default model (`meta-llama/llama-3.3-70b-instruct:free`) is free

## Setup

```bash
# Server
cd server
pnpm install
cp .env.example .env        # then paste your key into .env
pnpm dev                    # starts on http://localhost:3002

# Client (separate terminal)
cd client
pnpm install
pnpm dev                    # starts on http://localhost:5174
```

You can change the model in `.env` via `OPENROUTER_MODEL`. Good free options:
- `google/gemma-3-12b-it:free` — consistent, reliable (recommended for this demo)
- `openrouter/free` — auto-routes to available free models (default, but can pick incompatible thinking models)

See [free models](https://openrouter.ai/collections/free-models) for the full list.

The first server request will be slow (~10-30s) as it downloads the embedding model (~90MB, cached after first download).

## Usage

1. Open http://localhost:5174
2. Start typing a sentence in the textarea
3. Pause for 500ms — ghost text appears with a suggested completion
4. **Tab** to accept the suggestion
5. **Escape** to dismiss it
6. **Keep typing** to dismiss and trigger a new completion
7. Type the same/similar text again — the stats panel will show a cache hit (instant, no LLM call)

## Project Structure

```
genai/src/
├── server/                         # Hono backend (port 3002)
│   └── src/
│       ├── index.ts                # Routes: POST /api/complete, GET /api/stats
│       ├── types.ts                # CompletionRequest, CompletionChunk
│       ├── completion/
│       │   └── completion-service.ts   # Orchestrator: cache → LLM → cache store
│       ├── cache/
│       │   ├── embedder.ts         # Local embeddings (@xenova/transformers)
│       │   └── semantic-cache.ts   # sqlite-vec similarity search
│       ├── llm/
│       │   ├── openrouter-client.ts # Streaming + cancellation (OpenAI SDK → OpenRouter)
│       │   └── prompt-builder.ts   # System prompt construction
│       └── sse/
│           └── sse-response.ts     # Hand-built SSE formatting
│
└── client/                         # React frontend (port 5174)
    └── src/
        ├── App.tsx
        ├── hooks/
        │   ├── useDebounce.ts      # 500ms debounce
        │   └── useCompletion.ts    # SSE stream → ghost text state
        ├── components/Compose/
        │   ├── Compose.tsx         # Textarea + ghost text + keyboard
        │   ├── GhostText.tsx       # Gray suggestion overlay
        │   └── StatsPanel.tsx      # Tokens, cache hits, latency
        └── utils/
            └── sse-client.ts       # fetch + ReadableStream SSE parser
```

## Concepts Demonstrated

- **SSE streaming**: Hand-built `text/event-stream` response (server) and `ReadableStream` parser (client)
- **Streaming cancellation**: `AbortController` → server → OpenAI SDK `AbortSignal` → stops LLM inference
- **Semantic caching**: Embed context → sqlite-vec cosine similarity → cache hit skips LLM
- **Pause-based trigger**: 500ms debounce (longer than traditional 300ms due to LLM cost)
- **Ghost text UI**: Transparent overlay div mirroring textarea for inline suggestions
- **Cost awareness**: Stats panel tracking tokens, cache hit rate, estimated cost
