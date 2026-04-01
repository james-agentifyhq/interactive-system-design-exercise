/**
 * GenAI Smart Compose — Hono API Server
 *
 * Same structure as the fullstack server (CORS, logging, routes)
 * but with POST /api/complete returning SSE instead of GET /api/search returning JSON.
 *
 * Port 3002 (fullstack uses 3001).
 */

import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { Embedder } from './cache/embedder.js';
import { SemanticCache } from './cache/semantic-cache.js';
import { OpenRouterClient } from './llm/openrouter-client.js';
import { CompletionService } from './completion/completion-service.js';
import { createSSEStream } from './sse/sse-response.js';
import type { CompletionRequest } from './types.js';

// --- Check prerequisites ---
if (!process.env.OPENROUTER_API_KEY) {
  console.error('ERROR: OPENROUTER_API_KEY environment variable is required.');
  console.error('  Get a free key at https://openrouter.ai/keys');
  process.exit(1);
}

// --- Initialize services ---
const embedder = new Embedder();
const cache = new SemanticCache(embedder);
const llm = new OpenRouterClient();
const completionService = new CompletionService(cache, llm);

// --- App ---
const app = new Hono();

// CORS: Allow the Vite dev server (port 5174)
app.use(
  '*',
  cors({
    origin: ['http://localhost:5174', 'http://127.0.0.1:5174'],
    allowMethods: ['GET', 'POST'],
  }),
);

// Request logging (same pattern as fullstack)
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  console.log(`${c.req.method} ${c.req.url} → ${c.res.status} (${Date.now() - start}ms)`);
});

/**
 * POST /api/complete — SSE streaming completion
 *
 * Body: { context: { textBefore: string, textAfter: string }, options?: { maxTokens, temperature } }
 * Response: text/event-stream with CompletionChunk events
 */
app.post('/api/complete', async (c) => {
  let body: CompletionRequest;
  try {
    body = await c.req.json<CompletionRequest>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.context?.textBefore || body.context.textBefore.trim().length === 0) {
    return c.json({ error: 'context.textBefore is required' }, 400);
  }

  if (body.context.textBefore.length > 5000) {
    return c.json({ error: 'context.textBefore too long (max 5000 chars)' }, 400);
  }

  return createSSEStream(
    (writer) => completionService.complete(body, writer, c.req.raw.signal),
    c.req.raw.signal,
  );
});

/** GET /api/stats — service statistics */
app.get('/api/stats', (c) => c.json(completionService.stats));

/** GET /api/health — health check */
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// --- Start ---
const port = 3002;
console.log(`GenAI server starting on http://localhost:${port}`);
console.log('Embedding model will download on first request (~90MB, cached after)');

serve({ fetch: app.fetch, port });

export { app, completionService };
