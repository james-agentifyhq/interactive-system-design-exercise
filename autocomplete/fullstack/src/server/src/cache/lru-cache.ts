/**
 * LRU (Least Recently Used) Cache — implemented from scratch.
 *
 * WHY LRU?
 * Autocomplete queries follow a power-law distribution: a small number of
 * popular prefixes ("fac", "goo", "ama") account for most queries.
 * LRU keeps these hot entries in cache and evicts rarely-used ones.
 *
 * DATA STRUCTURE:
 * Doubly-linked list + Hash map — the classic combination.
 * - Hash map: O(1) key lookup
 * - Doubly-linked list: O(1) move-to-front (on access) and O(1) evict-from-tail
 *
 * INTERVIEW TIP:
 * "Design an LRU Cache" is one of the most common interview questions (LeetCode #146).
 * The key insight is combining two data structures to get O(1) for all operations.
 * Don't forget edge cases: empty cache, single-item cache, TTL expiration.
 *
 * Visual representation:
 *
 *   Hash Map              Doubly Linked List
 *   ┌─────────┐
 *   │ key1 ───┼──→  HEAD ←→ [key1] ←→ [key2] ←→ [key3] ←→ TAIL
 *   │ key2 ───┼──→                      ↑
 *   │ key3 ───┼──→           most recent             least recent
 *   └─────────┘                                      (evict here)
 */

interface ListNode<K, V> {
  key: K;
  value: V;
  createdAt: number;
  prev: ListNode<K, V> | null;
  next: ListNode<K, V> | null;
}

export class LRUCache<K, V> {
  private capacity: number;
  private ttlMs: number;
  private map: Map<K, ListNode<K, V>> = new Map();

  // Sentinel nodes simplify edge cases — we never have to check for null
  // head/tail. The real data lives between head and tail.
  private head: ListNode<K, V>;
  private tail: ListNode<K, V>;

  // Stats for monitoring cache effectiveness
  private _hits = 0;
  private _misses = 0;

  constructor(capacity: number, ttlMs: number = 60_000) {
    this.capacity = capacity;
    this.ttlMs = ttlMs;

    // Create sentinel nodes (dummy head and tail)
    this.head = { key: null as K, value: null as V, createdAt: 0, prev: null, next: null };
    this.tail = { key: null as K, value: null as V, createdAt: 0, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Get a value from the cache.
   *
   * On hit: move the node to the front (most recently used) and return value.
   * On miss (or expired): return undefined.
   */
  get(key: K): V | undefined {
    const node = this.map.get(key);

    if (!node) {
      this._misses++;
      return undefined;
    }

    // Check TTL — if expired, treat as miss and remove
    if (Date.now() - node.createdAt > this.ttlMs) {
      this.removeNode(node);
      this.map.delete(key);
      this._misses++;
      return undefined;
    }

    // Move to front (most recently used)
    this.removeNode(node);
    this.addToFront(node);

    this._hits++;
    return node.value;
  }

  /**
   * Set a value in the cache.
   *
   * If key exists: update value, reset TTL, move to front.
   * If at capacity: evict the least recently used entry (tail).
   * Insert new entry at the front.
   */
  set(key: K, value: V): void {
    // If key already exists, remove it first (we'll re-add at front)
    if (this.map.has(key)) {
      const existing = this.map.get(key)!;
      this.removeNode(existing);
      this.map.delete(key);
    }

    // If at capacity, evict the least recently used (node before tail sentinel)
    if (this.map.size >= this.capacity) {
      const lru = this.tail.prev!;
      this.removeNode(lru);
      this.map.delete(lru.key);
    }

    // Create and insert new node at front
    const newNode: ListNode<K, V> = {
      key,
      value,
      createdAt: Date.now(),
      prev: null,
      next: null,
    };

    this.addToFront(newNode);
    this.map.set(key, newNode);
  }

  /**
   * Remove a node from the doubly-linked list.
   * O(1) because we have direct pointers to prev and next.
   */
  private removeNode(node: ListNode<K, V>): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  /**
   * Add a node right after the head sentinel (most recently used position).
   */
  private addToFront(node: ListNode<K, V>): void {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  /** Number of entries currently in the cache */
  get size(): number {
    return this.map.size;
  }

  /** Cache hit/miss statistics */
  get stats() {
    const total = this._hits + this._misses;
    return {
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? this._hits / total : 0,
    };
  }

  /** Clear all entries */
  clear(): void {
    this.map.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this._hits = 0;
    this._misses = 0;
  }
}
