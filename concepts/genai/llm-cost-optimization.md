# LLM Cost Optimization

**What**: Strategies to minimize LLM inference costs at scale while maintaining acceptable quality.
**When to use**: Production systems with high request volumes where LLM costs are significant (>$1K/month).
**Tradeoffs**: 60-90% cost reduction possible vs increased system complexity and engineering effort.

## How It Works

**Cost structure**: LLM inference costs = (input tokens × input price) + (output tokens × output price) × request volume

**Optimization strategies ranked by impact:**

### 1. Trigger Filtering (60-80% reduction)
Skip inference for requests unlikely to benefit:
- **Mid-word triggers**: Don't complete while user is typing a word
- **Deletion events**: Skip when user is deleting text
- **Trivial contexts**: Empty lines, single characters, whitespace-only
- **High-velocity typing**: Debounce and cancel if user keeps typing

```python
def should_trigger_inference(context, user_event):
    # Skip if cursor is mid-word
    if is_inside_word(context.cursor_position):
        return False

    # Skip if user just deleted text
    if user_event.type == "deletion":
        return False

    # Skip if context too minimal
    if len(context.text.strip()) < 3:
        return False

    # Debounce: wait 300ms of inactivity
    if time_since_last_keystroke() < 300:
        return False

    return True
```

**Impact**: Reduces 60-80% of requests with minimal impact on UX (users don't notice missing completions they wouldn't see anyway).

### 2. Token Budget Management (20-40% reduction)
Control token usage:
- **Shorter prompts**: Remove unnecessary context, keep only relevant code/text
- **max_tokens caps**: Limit completion length (e.g., 256 tokens for autocomplete)
- **Stop sequences**: Prevent over-generation
- **Context window optimization**: Use sliding window, not full file

### 3. Batching (30-50% reduction for self-hosted)
Process multiple requests together:
- **vLLM/TGI**: Continuous batching with shared KV cache
- **Group similar requests**: Same model, similar length
- **Throughput vs latency**: Batching increases throughput but may add latency

### 4. Caching Layers (40-70% reduction with high hit rate)
Avoid redundant inference:
- **Exact caching**: Same prompt → same response (20-30% hit rate)
- **Semantic caching**: Similar meaning → cached response (30-50% hit rate)
- **Prefix caching**: Reuse prompt embeddings (reduces input token cost by 50%)

### 5. Model Tiering (40-60% reduction)
Route to cheapest viable model:
- Tier 1: Fast/cheap for 70% of requests ($0.001/1K tokens)
- Tier 2: Balanced for 25% of requests ($0.01/1K tokens)
- Tier 3: Quality for 5% critical requests ($0.05/1K tokens)

### 6. Self-Hosting vs API Cost Breakeven
When to self-host:

**API costs** (example):
- 100M tokens/day
- Average $0.01/1K tokens
- Daily cost: $1,000 = $30K/month

**Self-hosted costs**:
- 8× A100 GPUs: $15K/month (cloud) or $100K upfront (on-prem)
- Engineering: 2 FTEs × $150K = $300K/year = $25K/month
- Total: $40K/month

**Breakeven**: ~40M tokens/day for this example. Varies by model size and optimization.

**Self-hosting advantages:**
- Control over latency and availability
- Data privacy
- Custom optimizations (quantization, batching)

**API advantages:**
- No infrastructure management
- Automatic scaling
- Latest model versions
- Lower upfront cost

## Complexity / Performance

**Cost monitoring**: Track per-endpoint, per-user, per-feature:
```
/autocomplete: $500/day (100M tokens)
/chat: $200/day (20M tokens)
/refactor: $100/day (5M tokens)
```

**ROI of optimizations** (example):

| Strategy | Implementation effort | Monthly savings | ROI |
|----------|---------------------|-----------------|-----|
| Trigger filtering | 1 week | $18K (60%) | Immediate |
| Semantic caching | 2 weeks | $10K (40% of remaining) | 1 month |
| Model tiering | 3 weeks | $5K (30% of remaining) | 2 months |
| Self-hosting | 3 months | Variable | 6-12 months |

**Latency impact**: Some optimizations add latency:
- Caching: +5-20ms (lookup)
- Model tiering: +5-10ms (routing decision)
- Batching: +50-200ms (waiting for batch to fill)

**Quality monitoring**: Ensure cost cuts don't degrade UX:
- Track acceptance rate before/after each optimization
- A/B test with percentage of traffic
- Gradual rollout with feature flags

## Real-World Examples

**GitHub Copilot cost structure** (estimated):
- ~1M active users
- ~10 completions/user/hour × 500 tokens avg = 5K tokens/user/hour
- Daily: 120M tokens × $0.002 = $240K/day = $7M/month
- Optimizations likely reduce to $2-3M/month through filtering + caching + tiering

**OpenAI API users**: Prefix caching (prompt caching) reduced input costs by 50-90% for repetitive prompts (system messages, file context).

**Anthropic Claude**: Offers prompt caching explicitly. Cached tokens cost 90% less. For autocomplete with reused file context, saves 40-60% on input costs.

**Vercel AI SDK**: Built-in caching and deduplication. Multiple concurrent requests with same input = single LLM call.

**Production cost optimization stack:**
```
Request → Trigger filter (skip 70%)
       → Exact cache check (hit 20%)
       → Semantic cache check (hit 30% of remaining)
       → Model tier router (tier1 70%, tier2 25%, tier3 5%)
       → LLM inference
       → Cache result
       → Return to user
```

**Cost breakdown example** (autocomplete system):
- Baseline: $30K/month (no optimization)
- After trigger filtering: $12K/month (60% reduction)
- After caching: $7K/month (42% additional reduction)
- After model tiering: $4.5K/month (36% additional reduction)
- Total: 85% cost reduction

**Metrics to track:**
- Cost per request
- Cost per active user
- Cache hit rate (exact + semantic)
- Model tier distribution
- Acceptance rate (quality proxy)
- Triggered vs executed ratio (filtering effectiveness)

## Related Concepts
- `./model-tiering.md` — routing to cheaper models
- `./semantic-caching.md` — caching by meaning similarity
- `./prompt-engineering.md` — reducing prompt token count
- `./streaming-inference.md` — cancellation reduces wasted inference
- `./speculative-decoding.md` — speedup for self-hosted inference
- `../backend/caching.md` — general caching principles
