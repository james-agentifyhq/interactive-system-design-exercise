/**
 * API Layer — Hono HTTP server for the autocomplete backend.
 *
 * RESPONSIBILITIES:
 * - HTTP routing and request handling
 * - Input validation
 * - CORS (so the React frontend can call this from a different port)
 * - Artificial delay support (for testing loading states in the UI)
 * - Request logging
 *
 * DESIGN NOTE:
 * The API layer is intentionally thin. All business logic lives in the
 * Searcher service. This separation makes the code testable — you can
 * unit test the Searcher without HTTP, and integration test the API separately.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { Searcher, type SearchItem } from './search/searcher.js';
import dataset from './data/dataset.json' with { type: 'json' };

const app = new Hono();

// Initialize the search service with our dataset
const searcher = new Searcher(dataset as SearchItem[]);

// --- Middleware ---

// CORS: Allow the Vite dev server (port 5173) to call this API
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  allowMethods: ['GET'],
}));

// Request logging
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.url} → ${c.res.status} (${ms}ms)`);
});

// --- Routes ---

/**
 * GET /api/search?q=<query>&limit=<limit>&delay=<delay>
 *
 * Main search endpoint. Returns ranked autocomplete suggestions.
 *
 * Query params:
 *   q     - Search query (required)
 *   limit - Max results (default: 10, max: 50)
 *   delay - Artificial delay in ms for testing (default: 0)
 */
app.get('/api/search', async (c) => {
  const query = c.req.query('q');
  const limitParam = c.req.query('limit');
  const delayParam = c.req.query('delay');

  // Validate: query is required
  if (query === undefined || query === null) {
    return c.json({ error: 'Missing required parameter: q', code: 'INVALID_QUERY' }, 400);
  }

  // Validate: query length
  if (query.length > 100) {
    return c.json({ error: 'Query too long (max 100 characters)', code: 'INVALID_QUERY' }, 400);
  }

  // Parse limit (default 10, max 50)
  const limit = Math.min(Math.max(parseInt(limitParam || '10', 10) || 10, 1), 50);

  // Artificial delay for testing loading states in the UI
  const delay = parseInt(delayParam || '0', 10) || 0;
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 5000)));
  }

  const response = searcher.search(query, limit);
  return c.json(response);
});

/**
 * GET /api/stats
 * Returns cache statistics for monitoring/debugging.
 */
app.get('/api/stats', (c) => {
  return c.json({
    cache: searcher.cacheStats,
    dataset: { count: (dataset as SearchItem[]).length },
  });
});

/**
 * GET /api/health
 * Health check endpoint.
 */
app.get('/api/health', (c) => {
  return c.json({ status: 'ok' });
});

// --- Start server ---
const port = 3001;
console.log(`Autocomplete server running on http://localhost:${port}`);
console.log(`Dataset: ${(dataset as SearchItem[]).length} items loaded`);
console.log(`Try: http://localhost:${port}/api/search?q=san`);

serve({ fetch: app.fetch, port });

export { app, searcher };
