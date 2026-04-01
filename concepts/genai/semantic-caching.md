# Semantic Caching

**What**: Caching LLM responses based on meaning similarity rather than exact key matches.
**When to use**: Repetitive or boilerplate queries with slight variations (FAQs, common code patterns, documentation).
**Tradeoffs**: Can reduce latency/cost by 40-70% for cache hits, but requires vector search infrastructure and careful threshold tuning.

## How It Works

Traditional caching requires exact match. Semantic caching matches on meaning:

1. **Embed the context**: Convert user prompt/context into a vector (768-1536 dimensions)
2. **Search cache**: Query vector database for similar past queries using cosine similarity
3. **Threshold check**: If similarity score > threshold (typically 0.85-0.95), return cached response
4. **Cache miss**: Generate new response, embed query, store query vector + response
5. **Eviction**: LRU or TTL-based removal of old entries

```
User Query: "How do I sort a list in Python?"
     ↓
Embedding Model (text-embedding-3-small)
     ↓
Vector: [0.12, -0.34, 0.89, ...]
     ↓
Vector DB Search (cosine similarity)
     ↓
Found: "What's the way to sort lists in Python?" (similarity: 0.92)
     ↓
Return cached response (bypass LLM)
```

**Similarity threshold tuning:**
- Too low (0.70): False positives, return irrelevant cached responses
- Too high (0.98): Few cache hits, defeats purpose
- Sweet spot: 0.85-0.92 depending on domain

**Vector databases commonly used:**
- **pgvector**: Postgres extension, good for existing Postgres setups
- **Pinecone**: Managed service, easy to start
- **Qdrant**: Open-source, high performance
- **Redis with RediSearch**: If already using Redis
- **HNSW index**: Algorithm used by most vector DBs for fast approximate nearest neighbor search

## Complexity / Performance

**Embedding latency**: 10-50ms for small embedding models (OpenAI, Cohere)

**Vector search latency**: 5-20ms with proper indexing (HNSW), can scale to millions of vectors

**Cache hit rate**: Highly domain-dependent:
- Customer support FAQs: 50-70%
- Code autocomplete boilerplate: 30-50%
- Unique creative content: 5-15%

**Storage**: Each cache entry is vector (4-6KB) + response (variable). For 100K entries: ~500MB-5GB.

**Cost savings calculation:**
- Cache hit: embedding cost (~$0.00001) + storage
- Cache miss: embedding + LLM generation ($0.001-0.01)
- At 50% hit rate with 1M requests/day: ~$500-5000/day savings

## Real-World Examples

**GPTCache**: Open-source semantic caching library supporting multiple backends (Redis, SQLite, vector DBs). Reference implementation with configurable similarity functions.

**LangChain**: Built-in semantic caching via `set_llm_cache(SemanticCache(embedding, store))`.

**OpenAI + Pinecone pattern**: Common stack for production semantic caching. Embed with text-embedding-3-small, store in Pinecone, 50ms P50 cache lookup.

**GitHub Copilot**: Likely uses semantic caching for common code patterns (sorting, API calls, boilerplate). Same logical request in different variable names still gets cached.

**Customer support chatbots**: Cluster similar questions ("refund policy" vs "how do I get my money back") and serve same answer. RedisAI + Hugging Face embeddings stack.

**When it helps:**
- Repetitive queries (docs, FAQs, onboarding)
- Common patterns (code snippets, templates)
- Multi-user scenarios with overlapping needs

**When it doesn't:**
- Highly unique, creative content
- Context-specific queries (references to specific IDs, names)
- Real-time data requirements (stock prices, live scores)

## Related Concepts
- `../caching.md` — exact-match caching strategies
- `./embeddings-and-vector-search.md` — how embeddings and similarity search work
- `./llm-cost-optimization.md` — semantic caching as cost reduction strategy
- `./rag.md` — similar retrieval mechanism, different purpose
- `../backend/cdn.md` — caching at network edge vs semantic layer
