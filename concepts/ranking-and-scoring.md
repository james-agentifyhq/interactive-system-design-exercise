# Ranking and Scoring

**What**: Assigning numerical scores to items (search results, recommendations, feeds) to order them by relevance, quality, or predicted user preference.

**When to use**: In search engines, recommendation systems, newsfeed ranking, spam detection, or any system that needs to prioritize items for users.

**Tradeoffs**: Relevance and user satisfaction vs. computational cost, index complexity, and ranking bias; simple heuristics vs. machine learning models.

## How It Works

**Scoring Formulas**: Combine multiple signals into a single score

```
score = w1 × relevance + w2 × freshness + w3 × popularity + w4 × personalization

Example:
score = 0.5 × text_match + 0.2 × recency + 0.2 × upvotes + 0.1 × user_affinity
```

**Relevance Signals**:
- **Text matching**: TF-IDF, BM25 scores for query-document similarity
- **Popularity**: Click-through rate, upvotes, reviews, social shares
- **Freshness**: Decay score over time, boost recent items
- **Quality**: Author reputation, content completeness, spam score
- **Personalization**: User history, collaborative filtering, embeddings similarity

**TF-IDF (Term Frequency-Inverse Document Frequency)**:
```
TF-IDF(term, doc) = TF(term, doc) × IDF(term)

TF = (# times term appears in doc) / (# terms in doc)
IDF = log(total docs / docs containing term)

Intuition: Reward terms that appear often in THIS doc but rarely overall
```

**BM25 (Best Matching 25)**:
- Improved TF-IDF with saturation and length normalization
- Industry standard for text search (Elasticsearch default)
```
BM25 = IDF × (TF × (k1 + 1)) / (TF + k1 × (1 - b + b × doc_length/avg_doc_length))

k1, b: tuning parameters (typical: k1=1.2, b=0.75)
```

**Learning to Rank (LTR)**:
- **Pointwise**: Predict relevance score for each item independently
- **Pairwise**: Learn which of two items should rank higher
- **Listwise**: Optimize entire ranking order
- Uses ML models (gradient boosting, neural nets) trained on features + labeled data

## Complexity / Performance

**Computation**:
- **Simple scoring**: O(n) to score all candidates, O(n log k) to get top k
- **TF-IDF/BM25**: O(query terms × matching docs) with inverted index
- **ML models**: O(features × model complexity) per item, can be expensive
- **Two-stage ranking**: Fast retrieval (thousands) → expensive reranking (top 100)

**Index Requirements**:
- **Inverted index**: Maps terms → documents for fast text search
- **Forward index**: Stores features per document for scoring
- **Precomputed scores**: Cache static signals (popularity, quality)

**Real-time vs Batch**:
- **Real-time**: Compute scores on query (flexible but slower)
- **Batch**: Precompute scores, refresh periodically (fast but less dynamic)
- **Hybrid**: Combine precomputed base score + real-time adjustments

**Performance Optimizations**:
- Early termination: Stop scoring after top-k scores stabilize
- Quantization: Use lower precision for speed (int8 vs float32)
- Candidate generation: Filter to relevant subset before scoring
- Caching: Cache scores for popular queries

## Real-World Examples

**Search Engines**:
- **Google**: PageRank + 200+ ranking signals, neural ranking models
- **Elasticsearch**: BM25 default, supports custom scoring functions, function_score queries
- **Algolia**: Typo tolerance, custom ranking attributes, faceted search

**Recommendation Systems**:
- **YouTube**: Candidate generation (millions → thousands) + ranking (thousands → top N)
- **Netflix**: Collaborative filtering, content-based, hybrid models
- **Amazon**: Item-to-item collaborative filtering, "customers who bought X also bought Y"

**Social Feeds**:
- **Facebook/Instagram**: Engagement prediction (likes, comments, shares), dwell time
- **Twitter**: Chronological + algorithmic, relevance score with recency decay
- **Reddit**: Hotness formula = upvotes with time decay, Wilson score for controversial

**Spam Detection**:
- **Email**: Bayesian spam filters, sender reputation, content analysis
- **Comments**: Toxicity scores, user karma, rate limiting

**Production Example** (Elasticsearch):
```json
{
  "query": {
    "function_score": {
      "query": { "match": { "title": "search query" } },
      "functions": [
        { "field_value_factor": { "field": "popularity", "modifier": "log1p" } },
        { "gauss": { "published_date": { "scale": "30d", "decay": 0.5 } } },
        { "script_score": { "script": "doc['upvotes'].value / (1 + doc['downvotes'].value)" } }
      ],
      "score_mode": "sum",
      "boost_mode": "multiply"
    }
  }
}
```

## Related Concepts

- `./data-modeling.md` - Indexing strategies for efficient scoring
- `./caching.md` - Cache popular query results and scores
- `./monitoring-and-observability.md` - Track search quality metrics (CTR, MRR, NDCG)
- `./api-design.md` - Pagination and sorting in search APIs
