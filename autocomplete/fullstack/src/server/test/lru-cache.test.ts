import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LRUCache } from '../src/cache/lru-cache.js';

describe('LRUCache', () => {
  it('should store and retrieve values', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
  });

  it('should return undefined for missing keys', () => {
    const cache = new LRUCache<string, number>(3);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should evict least recently used when at capacity', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Cache is full: [c, b, a]
    // Adding 'd' should evict 'a' (least recently used)
    cache.set('d', 4);

    expect(cache.get('a')).toBeUndefined(); // evicted
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('should move accessed items to front (most recently used)', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Access 'a' → moves it to front: [a, c, b]
    cache.get('a');

    // Adding 'd' should evict 'b' (now the least recently used)
    cache.set('d', 4);

    expect(cache.get('a')).toBe(1); // still exists
    expect(cache.get('b')).toBeUndefined(); // evicted
  });

  it('should update value for existing key', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('a', 2);

    expect(cache.get('a')).toBe(2);
    expect(cache.size).toBe(1);
  });

  it('should track hit/miss statistics', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);

    cache.get('a'); // hit
    cache.get('b'); // miss
    cache.get('a'); // hit
    cache.get('c'); // miss

    const stats = cache.stats;
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(2);
    expect(stats.hitRate).toBe(0.5);
  });

  it('should expire entries based on TTL', () => {
    vi.useFakeTimers();

    const cache = new LRUCache<string, number>(10, 1000); // 1 second TTL
    cache.set('a', 1);

    expect(cache.get('a')).toBe(1); // before TTL

    vi.advanceTimersByTime(1001); // advance past TTL

    expect(cache.get('a')).toBeUndefined(); // expired

    vi.useRealTimers();
  });

  it('should clear all entries', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.stats.hits).toBe(0);
  });

  it('should handle capacity of 1', () => {
    const cache = new LRUCache<string, number>(1);
    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.size).toBe(1);
  });
});
