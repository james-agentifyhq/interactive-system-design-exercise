# Model Tiering

**What**: Using multiple models of different sizes/costs, routing requests to the appropriate tier based on complexity and quality requirements.
**When to use**: Cost-sensitive production systems with variable request complexity (autocomplete, chat, search).
**Tradeoffs**: 40-70% cost reduction vs added routing complexity and latency from decision logic.

## How It Works

Instead of using one model for all requests, route intelligently:

**Tier structure (example):**
- **Tier 1 (Fast/Cheap)**: Small model for simple, high-confidence cases
  - Claude Haiku, GPT-3.5-turbo, Codex-cushman
  - Cost: $0.001-0.003 per 1K tokens
  - Latency: 100-300ms

- **Tier 2 (Balanced)**: Medium model for standard complexity
  - Claude Sonnet, GPT-4-turbo
  - Cost: $0.01-0.03 per 1K tokens
  - Latency: 300-800ms

- **Tier 3 (Quality)**: Large model for complex/critical cases
  - Claude Opus, GPT-4
  - Cost: $0.03-0.10 per 1K tokens
  - Latency: 500-1500ms

**Routing strategies:**

1. **Confidence-based**: Use small model first, escalate if confidence low
```
result = tier1_model.generate(prompt)
if result.confidence < 0.8:
    result = tier2_model.generate(prompt)
```

2. **Complexity heuristics**: Route based on input characteristics
```
if token_count > 2000 or has_complex_code:
    use tier2
else:
    use tier1
```

3. **User segment**: Premium users get better models
```
if user.subscription == "premium":
    use tier2
else:
    use tier1
```

4. **Task-based**: Different models for different tasks
```
if task == "autocomplete":
    use tier1 (speed matters)
if task == "refactor":
    use tier2 (quality matters)
```

5. **A/B testing**: Route percentage to each tier, measure quality/cost
```
if random() < 0.2:
    use tier2  # 20% sample better model
else:
    use tier1
```

**Model cascading**: Progressive fallback
```
try tier1 → if unsure/failed → try tier2 → if still unsure → try tier3
```

## Complexity / Performance

**Latency consideration**: Routing decision should be <10ms, otherwise negates speed advantage of fast model.

**Cascade overhead**: If tier1 fails and escalates, total latency = tier1 + tier2 (worse than using tier2 directly). Need good routing to minimize cascades.

**Cost analysis** (example for 1M requests/day):

| Strategy | Tier1 % | Tier2 % | Tier3 % | Daily Cost |
|----------|---------|---------|---------|------------|
| All Tier 3 | 0% | 0% | 100% | $5,000 |
| All Tier 1 | 100% | 0% | 0% | $500 |
| Smart routing | 70% | 25% | 5% | $1,100 |

**Quality monitoring**: Must track acceptance rate by tier to ensure tier1 isn't degrading UX.

**Typical distributions in production:**
- Simple autocomplete: 80% tier1, 15% tier2, 5% tier3
- Complex code generation: 20% tier1, 60% tier2, 20% tier3
- Chat/QA: 40% tier1, 50% tier2, 10% tier3

## Real-World Examples

**OpenAI model families**: Users choose between GPT-3.5-turbo (fast/cheap), GPT-4-turbo (balanced), GPT-4 (quality). Smart applications route dynamically.

**Anthropic Claude tiers**: Haiku for drafts/autocomplete, Sonnet for standard use, Opus for critical reasoning. SDK supports automatic tier selection.

**GitHub Copilot**: Likely uses multiple Codex model sizes. Simple completions (single line, boilerplate) use smaller model. Complex multi-line or context-dependent completions escalate to larger model.

**Perplexity AI**: Fast answer from smaller model displayed immediately, then enhanced by larger model in background (progressive enhancement pattern).

**ChatGPT**: Different models for different conversation types. Simple factual questions → 3.5-turbo. Complex reasoning → GPT-4.

**Code completion in Cursor**: Inline suggestions use fast model, chat/command features use more powerful model.

**Implementation patterns:**
- Feature flags to adjust routing thresholds
- Logging tier usage and acceptance rates per tier
- Gradual rollout of new routing strategies
- Shadow mode: log what tier2 would generate vs tier1, compare quality offline

**Cascade example:**
```python
def get_completion(prompt, context):
    # Try tier 1 first
    result = haiku.complete(prompt, max_tokens=256)

    # Check confidence signal (e.g., perplexity, token probabilities)
    if result.avg_logprob < -2.0:  # Low confidence
        # Escalate to tier 2
        result = sonnet.complete(prompt, max_tokens=256)

    return result
```

## Related Concepts
- `./llm-cost-optimization.md` — model tiering as primary cost strategy
- `./evaluation-metrics.md` — measuring quality by tier to validate routing
- `../backend/load-balancing.md` — distributing requests across model endpoints
- `./prompt-engineering.md` — adapting prompts per model tier
- `./semantic-caching.md` — caching works across tiers
