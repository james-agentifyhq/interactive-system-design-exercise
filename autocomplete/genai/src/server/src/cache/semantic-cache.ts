/**
 * Semantic Cache — caches completions by meaning, not exact text match.
 *
 * Uses sqlite-vec for vector similarity search on embeddings.
 * When a new request arrives, we embed the context, search for similar
 * cached contexts, and return the cached completion if similarity is high enough.
 *
 * This is the "Deep Dive: Semantic Caching" section from genai.md:
 * - Traditional cache: exact key match ("san" → results)
 * - Semantic cache: meaning match (embed context → cosine similarity search)
 *
 * Two tables:
 * - cache_entries: stores the text context, completion, metadata
 * - cache_embeddings: vec0 virtual table for vector similarity search
 */

import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import type { Embedder } from './embedder.js';

interface CacheLookupResult {
  completion: string;
  similarity: number;
}

export class SemanticCache {
  private db: Database.Database;
  private embedder: Embedder;
  private similarityThreshold: number;
  private _lookups = 0;
  private _hits = 0;

  constructor(
    embedder: Embedder,
    dbPath: string = ':memory:',
    threshold: number = 0.92,
  ) {
    this.embedder = embedder;
    this.similarityThreshold = threshold;

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.defaultSafeIntegers(false);
    sqliteVec.load(this.db);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        context_text TEXT NOT NULL,
        completion TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        hit_count INTEGER DEFAULT 0
      )
    `);

    // vec0 virtual table with cosine distance (natural for text similarity)
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS cache_embeddings USING vec0(
        entry_id INTEGER PRIMARY KEY,
        embedding float[384] distance_metric=cosine
      )
    `);
  }

  /**
   * Look up a cached completion for a similar context.
   *
   * Flow: embed context → KNN search (k=1) → check similarity threshold.
   * Returns the cached completion if similar enough, null otherwise.
   */
  async lookup(contextText: string): Promise<CacheLookupResult | null> {
    this._lookups++;

    const embedding = await this.embedder.embed(contextText);

    // KNN query: find the closest cached embedding
    const row = this.db
      .prepare(
        `SELECT entry_id, distance
         FROM cache_embeddings
         WHERE embedding MATCH ?
           AND k = 1`,
      )
      .get(Buffer.from(embedding.buffer)) as
      | { entry_id: number; distance: number }
      | undefined;

    if (!row) return null;

    // sqlite-vec with cosine distance_metric returns cosine distance (1 - cosine_similarity)
    // So similarity = 1 - distance
    const similarity = 1 - row.distance;

    if (similarity < this.similarityThreshold) return null;

    // Fetch the cached completion
    const entry = this.db
      .prepare('SELECT completion FROM cache_entries WHERE id = ?')
      .get(row.entry_id) as { completion: string } | undefined;

    if (!entry) return null;

    // Increment hit count
    this.db
      .prepare('UPDATE cache_entries SET hit_count = hit_count + 1 WHERE id = ?')
      .run(row.entry_id);

    this._hits++;
    return { completion: entry.completion, similarity };
  }

  /**
   * Store a completion in the cache with its embedding.
   *
   * Called after a successful LLM generation (fire-and-forget from the caller).
   */
  async store(
    contextText: string,
    completion: string,
    model: string,
  ): Promise<void> {
    const embedding = await this.embedder.embed(contextText);

    this.db
      .prepare(
        `INSERT INTO cache_entries (context_text, completion, model, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(contextText, completion, model, Date.now());

    // Use last_insert_rowid() in SQL to avoid BigInt/Number type issues with sqlite-vec
    this.db
      .prepare(
        `INSERT INTO cache_embeddings (entry_id, embedding)
         VALUES (last_insert_rowid(), ?)`,
      )
      .run(Buffer.from(embedding.buffer));
  }

  get stats() {
    const entries = this.db
      .prepare('SELECT COUNT(*) as count FROM cache_entries')
      .get() as { count: number };
    const totalHits = this.db
      .prepare('SELECT COALESCE(SUM(hit_count), 0) as sum FROM cache_entries')
      .get() as { sum: number };

    return {
      entries: entries.count,
      totalCacheHits: totalHits.sum,
      lookups: this._lookups,
      hits: this._hits,
      hitRate: this._lookups > 0 ? this._hits / this._lookups : 0,
    };
  }
}
