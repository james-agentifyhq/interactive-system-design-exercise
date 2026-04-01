import { describe, it, expect } from 'vitest';
import { app } from '../src/index.js';

describe('API', () => {
  it('GET /api/search?q=san should return San cities', async () => {
    const res = await app.request('/api/search?q=san');
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.query).toBe('san');
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results.every((r: any) => r.name.toLowerCase().includes('san'))).toBe(true);
    expect(data.meta.total).toBeGreaterThan(0);
    expect(typeof data.meta.took).toBe('number');
  });

  it('should return 400 when q parameter is missing', async () => {
    const res = await app.request('/api/search');
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe('INVALID_QUERY');
  });

  it('should respect limit parameter', async () => {
    const res = await app.request('/api/search?q=s&limit=3');
    const data = await res.json();

    expect(data.results.length).toBeLessThanOrEqual(3);
  });

  it('should return cached results on repeated queries', async () => {
    // First request — cache miss
    const res1 = await app.request('/api/search?q=apple');
    const data1 = await res1.json();
    expect(data1.meta.cached).toBe(false);

    // Second request — cache hit
    const res2 = await app.request('/api/search?q=apple');
    const data2 = await res2.json();
    expect(data2.meta.cached).toBe(true);
  });

  it('should return empty results for empty query', async () => {
    const res = await app.request('/api/search?q=');
    const data = await res.json();

    expect(data.results).toEqual([]);
    expect(data.meta.total).toBe(0);
  });

  it('GET /api/health should return ok', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('GET /api/stats should return cache stats', async () => {
    const res = await app.request('/api/stats');
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.cache).toBeDefined();
    expect(data.dataset).toBeDefined();
  });

  it('should include highlight information in results', async () => {
    const res = await app.request('/api/search?q=app');
    const data = await res.json();

    for (const result of data.results) {
      expect(result.highlight).toBeDefined();
      expect(typeof result.highlight.start).toBe('number');
      expect(typeof result.highlight.end).toBe('number');
    }
  });
});
