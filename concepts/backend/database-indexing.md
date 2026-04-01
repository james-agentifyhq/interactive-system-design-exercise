# Database Indexing

**What**: Data structures that improve query performance by creating efficient lookup paths, trading storage and write speed for faster reads.

**When to use**: Columns used in WHERE, JOIN, ORDER BY clauses. High read-to-write ratio. Avoid over-indexing (slows writes, wastes space).

**Tradeoffs**: Faster queries (ms → μs) vs slower writes (inserts update indexes), increased storage (10-50% overhead), index maintenance cost.

## How It Works

**Common index types**:

1. **B-tree (balanced tree)**:
   - Default for most databases (MySQL InnoDB, Postgres)
   - Sorted tree structure, O(log N) lookup
   - Supports range queries, sorting, prefix matching
   - Each node has multiple keys/children (not binary), optimized for disk I/O

2. **Hash index**:
   - Hash table, O(1) exact match lookup
   - No range queries or sorting
   - Used for in-memory databases (Redis) or specific engines (MySQL MEMORY)

3. **Full-text search (inverted index)**:
   - Maps words → document IDs
   - Enables `LIKE '%term%'`, ranking, stemming
   - Postgres: `GIN` index, MySQL: `FULLTEXT`, Elasticsearch: default

4. **Geospatial index**:
   - R-tree, quad-tree for lat/lon queries
   - "Find points within 5km" efficiently
   - Postgres: `GIST`, MySQL: spatial indexes

**Composite (multi-column) indexes**:
- Index on `(last_name, first_name)` supports queries on:
  - `last_name` (leftmost prefix)
  - `last_name, first_name`
  - But NOT just `first_name` alone
- Column order matters: most selective column first

**Covering index**:
- Index contains all columns needed for query (no table lookup)
- Example: `CREATE INDEX idx ON users(email, name)` covers `SELECT name WHERE email = ?`
- Faster (index-only scan), but larger index

**Clustered vs non-clustered**:
- **Clustered**: Table rows physically sorted by index key (one per table). InnoDB clusters by primary key.
- **Non-clustered**: Separate structure with pointers to rows (can have many).

## Complexity / Performance

- **Query speedup**: 1000x+ for selective queries (scan 1M rows → lookup 10)
- **Write overhead**: 10-30% slower inserts (update all indexes)
- **Storage**: 10-50% of table size per index
- **Index scan vs table scan**: Use index if selectivity <15% (rule of thumb), else full scan is faster

**Query optimization basics**:
1. Check query plan (`EXPLAIN` in SQL)
2. Look for "Seq Scan" (bad), want "Index Scan" or "Index Only Scan"
3. Add index if missing, or rewrite query to use existing index
4. Avoid functions on indexed columns (`WHERE YEAR(date) = 2024` → no index, use `WHERE date >= '2024-01-01'`)

**Index hints**: Force index usage (`USE INDEX`, `FORCE INDEX`) if optimizer wrong, but rarely needed.

## Real-World Examples

- **Postgres**: B-tree (default), GIN (full-text, JSONB), GiST (geospatial), BRIN (huge tables, sequential data)
- **MySQL InnoDB**: Clustered B-tree on primary key, secondary indexes point to PK
- **MongoDB**: B-tree, compound indexes, text indexes, geospatial (2dsphere)
- **Elasticsearch**: Inverted index for full-text, doc values for aggregations/sorting
- **Cassandra**: Partition key index (required), secondary indexes (limited, avoid)

**Real use cases**:
- **E-commerce**: Index `products.category` for filtering, `orders.user_id` for lookups
- **Social media**: Index `posts.user_id`, `posts.created_at` for timeline queries
- **Analytics**: Columnar indexes (Redshift, BigQuery) for OLAP
- **Search engines**: Inverted index for Google, Elasticsearch

## Related Concepts

- [`trie.md`](./trie.md) — Prefix trees for autocomplete, alternative to B-tree for strings
- [`sharding.md`](./sharding.md) — Indexes per shard, cross-shard queries can't use indexes
- [`lru-cache.md`](./lru-cache.md) — Cache hot index pages in memory (buffer pool)
- Query optimization — Analyze execution plans, rewrite queries, denormalize to avoid joins
