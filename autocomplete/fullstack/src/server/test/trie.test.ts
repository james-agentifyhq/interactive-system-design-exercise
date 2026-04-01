import { describe, it, expect } from 'vitest';
import { Trie } from '../src/search/trie.js';

describe('Trie', () => {
  it('should find items by exact prefix', () => {
    const trie = new Trie();
    trie.insert('apple', 1);
    trie.insert('application', 2);
    trie.insert('banana', 3);

    const results = trie.search('app');
    expect(results.has(1)).toBe(true);
    expect(results.has(2)).toBe(true);
    expect(results.has(3)).toBe(false);
  });

  it('should be case-insensitive', () => {
    const trie = new Trie();
    trie.insert('Apple', 1);
    trie.insert('AMAZON', 2);

    expect(trie.search('app').has(1)).toBe(true);
    expect(trie.search('APP').has(1)).toBe(true);
    expect(trie.search('ama').has(2)).toBe(true);
  });

  it('should return empty set for no matches', () => {
    const trie = new Trie();
    trie.insert('apple', 1);

    expect(trie.search('xyz').size).toBe(0);
    expect(trie.search('b').size).toBe(0);
  });

  it('should handle single character queries', () => {
    const trie = new Trie();
    trie.insert('apple', 1);
    trie.insert('amazon', 2);
    trie.insert('banana', 3);

    const results = trie.search('a');
    expect(results.size).toBe(2);
    expect(results.has(1)).toBe(true);
    expect(results.has(2)).toBe(true);
  });

  it('should handle multiple items with same name', () => {
    const trie = new Trie();
    trie.insert('test', 1);
    trie.insert('test', 2);

    const results = trie.search('test');
    expect(results.size).toBe(2);
  });

  it('should handle full word as prefix', () => {
    const trie = new Trie();
    trie.insert('app', 1);
    trie.insert('apple', 2);

    // Searching for "app" should match both
    expect(trie.search('app').size).toBe(2);
    // Searching for "apple" should only match item 2
    expect(trie.search('apple').size).toBe(1);
    expect(trie.search('apple').has(2)).toBe(true);
  });

  it('should report correct size', () => {
    const trie = new Trie();
    expect(trie.size).toBe(1); // root node

    trie.insert('ab', 1);
    expect(trie.size).toBe(3); // root + 'a' + 'b'

    trie.insert('ac', 2);
    expect(trie.size).toBe(4); // root + 'a' + 'b' + 'c'
  });
});
