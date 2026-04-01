# Data Modeling

**What**: Designing the structure and relationships of data in databases and application state to support efficient queries and business logic.

**When to use**: When designing any system that stores and retrieves data, from SQL schemas to frontend Redux stores.

**Tradeoffs**: Normalization (consistency, no duplication) vs. denormalization (read performance, simpler queries); flexibility vs. strict schemas; relational vs. document models.

## How It Works

**Schemas**: Define structure, types, constraints, and relationships.

```sql
-- Relational schema
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT,
  published_at TIMESTAMP,
  INDEX idx_user_published (user_id, published_at)
);
```

**Normalization vs Denormalization**:

- **Normalized** (3NF): No duplicate data, multiple tables joined
  - Pros: Single source of truth, easy updates, data integrity
  - Cons: Complex queries (JOINs), slower reads

- **Denormalized**: Duplicate data for query optimization
  - Pros: Fast reads (no JOINs), simpler queries
  - Cons: Update anomalies, storage overhead, consistency challenges

**Indexes**: Speed up queries by creating sorted lookup structures
- **B-tree**: Default for most DBs, good for range queries
- **Hash**: Fast equality lookups, no range support
- **Composite**: Index on multiple columns for specific query patterns
- Tradeoff: Faster reads vs. slower writes and storage overhead

**Relationships**:
- **One-to-many**: User has many posts (foreign key in posts)
- **Many-to-many**: Posts have many tags (join table: post_tags)
- **One-to-one**: User has one profile (rare, usually same table)

**Frontend vs Backend**:
- **Backend (DB)**: Normalized, relational, enforces constraints
- **Frontend (Redux/state)**: Denormalized for UI, entities by ID, avoid nesting
  ```js
  // Normalized state
  {
    users: { 1: { name: "Alice" } },
    posts: { 10: { userId: 1, title: "..." } }
  }
  ```

## Complexity / Performance

**Query Performance**:
- **Without index**: O(n) full table scan
- **With index**: O(log n) for B-tree, O(1) for hash
- **JOIN cost**: O(n × m) nested loop, optimized with indexes

**Write Performance**:
- Each index adds overhead to INSERT/UPDATE (maintain index structure)
- Normalized: Single update location
- Denormalized: Must update multiple locations

**Storage**:
- Normalized: Less storage (no duplication)
- Indexes: 20-50% of table size overhead
- Denormalized: 2-10x storage for heavily duplicated data

## Real-World Examples

- **PostgreSQL/MySQL**: Relational DBs with normalization, ACID transactions, complex schemas
- **MongoDB**: Document DB, denormalized JSON documents, flexible schema
- **Redis**: Key-value store, simple data structures (strings, hashes, lists, sets)
- **DynamoDB**: NoSQL, partition key + sort key, denormalized access patterns
- **Frontend (Redux)**: Normalized entities with `normalizr`, avoid nested state
- **GraphQL**: Schema definition language, type system, resolver mapping to DB

## Related Concepts

- `./caching.md` - Cache layer often denormalizes for performance
- `./api-design.md` - API response shape vs. database schema
- `./ranking-and-scoring.md` - Index design for search and scoring
- `./monitoring-and-observability.md` - Tracking query performance and slow queries
