# RAG (Retrieval-Augmented Generation)

**What**: Grounding LLM output in real, up-to-date data by retrieving relevant context and injecting it into the prompt before generation.
**When to use**: When LLM needs access to private/proprietary knowledge, recent data, or domain-specific information not in training data.
**Tradeoffs**: Enables accurate, grounded responses vs added latency (retrieval step) and system complexity (vector DB, chunking pipeline).

## How It Works

RAG combines retrieval (finding relevant info) with generation (LLM creating response):

**Pipeline:**
```
1. Offline indexing:
   Documents → Chunk → Embed → Store in Vector DB

2. Query time:
   User Query → Embed → Retrieve Top-K Chunks → Inject into Prompt → LLM Generate
```

**Detailed flow:**

**Indexing phase (offline):**
1. Load documents (docs, PDFs, databases, APIs)
2. Chunk into manageable pieces (256-512 tokens)
3. Generate embeddings for each chunk
4. Store vectors + metadata in vector database

**Retrieval phase (real-time):**
1. User submits query
2. Embed query into vector
3. Search vector DB for top-K most similar chunks (K=3-10)
4. Optional: re-rank results for relevance
5. Construct prompt with retrieved context + query
6. LLM generates response grounded in retrieved data

```
User: "What is our company's return policy?"
     ↓
Embed query → [0.23, -0.45, ...]
     ↓
Vector search → Top 3 chunks:
  1. "Returns accepted within 30 days..." (similarity: 0.92)
  2. "Refunds processed within 5 business days..." (similarity: 0.87)
  3. "Items must be unused and in original packaging..." (similarity: 0.84)
     ↓
Prompt construction:
  System: Answer using only the provided context.
  Context: [chunk 1] [chunk 2] [chunk 3]
  Question: What is our company's return policy?
     ↓
LLM generates: "Our return policy allows returns within 30 days..."
```

**Chunking strategies:**
- **Fixed size**: 512 tokens with 50-token overlap (simple, works well)
- **Semantic**: Split on section headers, paragraphs (better coherence)
- **Recursive**: Split large chunks until they fit size limit

**Retrieval quality:**
- **Precision**: % of retrieved chunks that are relevant (avoid noise)
- **Recall**: % of relevant chunks that are retrieved (avoid missing info)
- Target: >80% precision, >70% recall

**Re-ranking**: After initial vector retrieval, use cross-encoder model to re-score results for better precision.
- Adds 50-100ms latency
- Improves relevance by 10-20%
- Models: bge-reranker, Cohere rerank API

## Complexity / Performance

**Latency breakdown** (typical):
- Embed query: 10-30ms
- Vector search: 10-50ms
- Re-ranking (optional): 50-100ms
- LLM generation: 500-2000ms
- **Total**: 600-2200ms (retrieval adds 10-15% to total)

**Chunking parameters:**
- Chunk size: 256-512 tokens (sweet spot for most tasks)
- Overlap: 10-20% (prevents splitting mid-sentence/context)
- Too small: Loss of context, more chunks to search
- Too large: Irrelevant info in retrieval, wastes prompt budget

**Top-K tuning:**
- K=3: Fast, focused, may miss context
- K=5: Balanced (most common)
- K=10: Comprehensive, risks diluting prompt with noise

**Cost analysis:**
- Embedding cost: $0.02-0.13 per 1M tokens
- Vector DB: $0.10-0.50 per 1M vectors/month (managed services)
- LLM cost: $1-50 per 1M tokens (depends on model)
- RAG overhead: ~5-10% added cost vs generation alone

**Scaling:**
- 1K documents: Simple vector search (<10ms)
- 100K documents: HNSW index (10-30ms)
- 10M+ documents: Sharded vector DB, pre-filtering by metadata

## Real-World Examples

**ChatGPT with retrieval** (plugins, file uploads):
- Users upload PDFs, ChatGPT chunks and embeds them
- Queries retrieve relevant sections before answering
- Cites sources: "According to page 3 of your document..."

**Notion AI**:
- RAG over user's workspace (docs, notes, wikis)
- Chunks pages, stores in Pinecone
- Queries like "What did we decide in last week's meeting?" retrieve meeting notes

**Customer support bots**:
- RAG over help articles, past tickets, product docs
- Retrieve top 5 relevant articles → inject into prompt → generate answer
- Example: Intercom, Zendesk AI

**Enterprise search** (Glean, Vectara):
- Index all company documents (Slack, Google Drive, Confluence)
- Natural language queries retrieve + summarize results
- "What are the Q4 goals?" → retrieves relevant docs → summarizes

**Code completion with RAG**:
- Embed codebase (functions, classes, docs)
- At completion time, retrieve similar code snippets
- Inject into prompt for context-aware suggestions
- Example: Cursor IDE, Sourcegraph Cody

**Medical/legal QA**:
- RAG over specialized corpora (medical journals, legal cases)
- Ensures responses grounded in authoritative sources
- Critical for accuracy and trust

**Hybrid search (vector + keyword):**
```python
# Combine vector similarity with keyword search
vector_results = vector_db.search(query_embedding, top_k=20)
keyword_results = elasticsearch.search(query, top_k=20)

# Merge using Reciprocal Rank Fusion
final_results = rrf_merge(vector_results, keyword_results, top_k=5)
```

**When RAG is needed:**
- Private/proprietary data not in LLM training
- Recent information (post-training cutoff)
- Domain-specific knowledge (medical, legal, internal company)
- Source attribution requirements (cite where info came from)

**When RAG is NOT needed:**
- General knowledge questions (LLM training data sufficient)
- Creative tasks (no grounding needed)
- Very short contexts that fit in prompt directly

**RAG + fine-tuning:**
- Fine-tune LLM on domain-specific style/format
- Use RAG for retrieving up-to-date facts
- Best of both: domain expertise + current data

## Related Concepts
- `./embeddings-and-vector-search.md` — core retrieval mechanism
- `./prompt-engineering.md` — constructing prompts with retrieved context
- `./semantic-caching.md` — similar retrieval pattern, different use case
- `../search/elasticsearch.md` — hybrid search combining keyword + vector
- `./llm-cost-optimization.md` — RAG reduces need for massive context windows
