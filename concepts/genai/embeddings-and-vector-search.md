# Embeddings and Vector Search

**What**: Converting text to dense numerical vectors that capture semantic meaning, enabling similarity-based search.
**When to use**: Semantic search, recommendations, clustering, RAG systems, semantic caching — any task requiring meaning-based matching.
**Tradeoffs**: Enables fuzzy/semantic matching impossible with keyword search, but requires specialized infrastructure and careful tuning.

## How It Works

**Embeddings**: Map text to fixed-size vector in high-dimensional space where semantically similar texts are close together.

```
Text: "machine learning model"
        ↓ Embedding Model
Vector: [0.23, -0.45, 0.12, ..., 0.67]  (768 dimensions)

Text: "ML algorithm"
        ↓ Embedding Model
Vector: [0.25, -0.43, 0.15, ..., 0.64]  (768 dimensions)

Cosine similarity: 0.92 (very similar)
```

**Process:**
1. **Embedding**: Convert query text and corpus documents to vectors
2. **Indexing**: Store vectors in specialized data structure (vector database)
3. **Search**: Find K nearest neighbors to query vector
4. **Ranking**: Return most similar results by distance/similarity score

**Similarity metrics:**
- **Cosine similarity**: Angle between vectors (most common). Range: -1 to 1 (1 = identical)
- **Dot product**: Similar to cosine but considers magnitude
- **Euclidean distance**: Straight-line distance in vector space

**Embedding models:**
- **OpenAI**: text-embedding-3-small (512-1536 dim), text-embedding-3-large (256-3072 dim)
- **Cohere**: embed-english-v3.0, embed-multilingual-v3.0
- **Open-source**: sentence-transformers (SBERT), all-MiniLM-L6-v2, BGE, E5

**Dimensionality**: Trade-off between expressiveness and efficiency
- 384 dim: Fast, good for simple tasks
- 768 dim: Balanced (most common)
- 1536+ dim: More precise, slower search

**Chunking strategies** (for long documents):
- **Fixed size**: 256-512 tokens per chunk, 20% overlap
- **Semantic**: Split on paragraphs, sections, logical boundaries
- **Recursive**: Split until chunks fit size limit

## Complexity / Performance

**Embedding latency:**
- Small models: 10-50ms per text (batch-friendly)
- Large models: 50-200ms per text
- Batch processing: 1000 texts in ~500ms (amortized 0.5ms each)

**Vector search latency:**
- Exact search (brute force): O(n) — 10ms for 100K vectors
- HNSW index: O(log n) — 5-20ms for millions of vectors
- IVF index: O(√n) — 10-50ms with tuning

**Storage:**
- Per vector: dimensions × 4 bytes (float32)
- 768-dim vector: 3KB
- 1M vectors: ~3GB raw, 1-2GB with compression (PQ)

**Indexing time:**
- HNSW: 1M vectors in 5-10 minutes on modern hardware
- IVF: 1M vectors in 2-5 minutes

**Accuracy vs speed trade-off:**
- Exact search: 100% recall, slowest
- HNSW (ef=50): 95% recall, 10x faster
- HNSW (ef=10): 85% recall, 50x faster

**Vector databases and indexes:**

**HNSW (Hierarchical Navigable Small World):**
- Graph-based index
- Excellent recall (95%+) and speed
- Used by: Pinecone, Qdrant, Weaviate, Milvus

**IVF (Inverted File Index):**
- Cluster-based index
- Good for very large datasets (billions)
- Tuning: nprobe (more = slower but better recall)

**PQ (Product Quantization):**
- Compression technique, reduces memory 8-32x
- Some accuracy loss (~2-5% recall drop)

## Real-World Examples

**OpenAI embeddings:**
- text-embedding-3-small: $0.02 per 1M tokens, 1536 dim, 62% on MTEB benchmark
- text-embedding-3-large: $0.13 per 1M tokens, 3072 dim, 64% on MTEB benchmark
- Used for semantic search, clustering, recommendations

**Pinecone** (managed vector DB):
- HNSW index, 100M+ vectors
- P95 latency <50ms for search
- Used by: Notion AI, ChatGPT plugins, enterprise RAG

**pgvector** (Postgres extension):
- Good for small-medium datasets (< 1M vectors)
- Familiar SQL interface
- HNSW index support, 10-30ms search latency

**Qdrant** (open-source vector DB):
- Rust-based, high performance
- 500K+ queries/second on single server
- Filtering support (metadata + vector search)

**GitHub code search** (semantic):
- Embed code snippets with specialized models
- Find similar code across repositories
- Supports "find implementations of interface X" queries

**Semantic caching with embeddings:**
```python
# Cache lookup
query = "How do I sort a list in Python?"
query_embedding = embed(query)

# Search cache
results = vector_db.search(query_embedding, limit=1)
if results[0].similarity > 0.88:
    return results[0].cached_response
```

**Document search:**
```python
# Index documents
docs = load_documents()
chunks = split_into_chunks(docs, chunk_size=512)
embeddings = embed_batch(chunks)
vector_db.upsert(embeddings, metadata=chunks)

# Search
query = "What is the refund policy?"
query_embedding = embed(query)
results = vector_db.search(query_embedding, top_k=5)
```

**Batch vs real-time:**
- **Batch**: Embed large corpus offline (millions of docs), update daily/weekly
- **Real-time**: Embed queries and new content on demand (<100ms)

**Hybrid search** (vector + keyword):
- Combine BM25 (keyword) with vector similarity
- Better for named entities, exact matches
- Reciprocal Rank Fusion (RRF) to merge results

## Related Concepts
- `./semantic-caching.md` — uses embeddings for cache lookup
- `./rag.md` — uses embeddings to retrieve relevant documents
- `../backend/database-indexing.md` — vector indexes vs traditional indexes
- `./prompt-engineering.md` — retrieved embeddings injected into prompts
- `../search/elasticsearch.md` — keyword search vs semantic search
