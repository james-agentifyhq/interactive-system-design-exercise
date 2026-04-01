# Evaluation Metrics

**What**: Quantitative and qualitative measures for assessing GenAI autocomplete quality and user experience.
**When to use**: Continuously in production to monitor quality, compare models/strategies, and guide optimization.
**Tradeoffs**: Metrics provide objective feedback but can miss nuanced UX issues; combine multiple metrics for full picture.

## How It Works

**Key metrics for autocomplete/code completion:**

### 1. Acceptance Rate (Primary Quality Signal)
**Definition**: Percentage of suggestions that users accept (Tab/Enter)

```
Acceptance Rate = (Accepted Suggestions / Total Suggestions Shown) × 100%
```

**Targets:**
- Good: >30% acceptance rate
- Excellent: >50% acceptance rate
- Poor: <15% acceptance rate

**Segmentation:**
- By language (Python 40%, YAML 25%)
- By file type (tests 35%, configs 20%)
- By user cohort (new users 25%, power users 45%)

**Limitations**: User might accept then immediately delete (not captured). Need completion persistence metric.

### 2. Completion Persistence
**Definition**: Percentage of accepted completions still present in file after 5 minutes

```
Persistence = (Completions Still Present After 5min / Accepted Completions) × 100%
```

**Targets:**
- Good: >85% persistence
- Excellent: >95% persistence

**Measures**: True value of suggestion. Low persistence indicates users accept then realize it's wrong.

### 3. Characters Saved (Productivity Metric)
**Definition**: Total characters accepted via completions vs typed manually

```
Chars Saved Per Session = Σ(accepted_completion_lengths)
Productivity Gain = Chars Saved / (Chars Saved + Chars Typed Manually)
```

**Targets:**
- Good: 20-30% productivity gain
- Excellent: 40-50% productivity gain

**Context**: More meaningful when measured against active coding time, not idle time.

### 4. Time to First Token (TTFT) (Latency Metric)
**Definition**: Time from request initiation to first token delivered

```
TTFT = timestamp(first_token_received) - timestamp(request_sent)
```

**Targets:**
- P50: <300ms (users perceive as instant)
- P95: <800ms (acceptable)
- P99: <1500ms (max tolerable)

**Impact on UX**: >500ms TTFT reduces acceptance rate by 10-20%.

### 5. User Satisfaction (Qualitative)
**Collection methods:**
- Thumbs up/down on suggestions
- In-app surveys after session
- NPS (Net Promoter Score) surveys

**Targets:**
- Good: 70% positive feedback
- Excellent: 85% positive feedback

**Correlation**: Strong correlation between TTFT + acceptance rate and user satisfaction.

### 6. A/B Testing Methodology
Compare two variants (models, prompts, strategies):

**Experiment design:**
1. Split users 50/50 to variant A vs B
2. Run for 7-14 days (min 10K suggestions per variant)
3. Measure all metrics above
4. Statistical significance test (p < 0.05)

**Example:**
```
Variant A (baseline):    30% acceptance, 400ms TTFT
Variant B (new model):   35% acceptance, 350ms TTFT
Improvement:             +5pp acceptance, -50ms TTFT
Statistical sig:         p = 0.002 (significant)
Decision:                Ship variant B
```

**Guardrail metrics**: Monitor during A/B test:
- Error rate (should stay constant)
- Cost per request (ensure new variant doesn't explode costs)
- 99th percentile latency (catch tail latency issues)

## Complexity / Performance

**Data collection overhead:**
- Logging: <5ms per request
- Event streaming: Kafka/Kinesis for real-time metrics
- Storage: ~100 bytes per suggestion event

**Analysis pipeline:**
- Real-time dashboards: 1-minute lag (aggregated metrics)
- Detailed analysis: Daily batch jobs (per-user, per-file breakdowns)
- A/B test results: Weekly reports

**Sample size requirements:**
- Minimum 1K accepted suggestions per variant for statistical power
- 10K+ suggestions for detecting <5pp differences
- 100K+ for subtle latency differences

**Metric instrumentation:**
```python
class SuggestionEvent:
    suggestion_id: str
    user_id: str
    timestamp: datetime
    context_length: int
    suggestion_length: int
    model: str
    latency_ms: int
    accepted: bool
    still_present_5min: bool  # async check
    user_feedback: Optional[str]  # thumbs up/down
```

## Real-World Examples

**GitHub Copilot metrics** (public reports):
- ~30% overall acceptance rate (varies by language)
- 46% of code written using Copilot by daily active users
- Productivity gain: ~55% faster task completion in studies

**Tabnine metrics:**
- P50 latency: <250ms
- 25-35% acceptance rate depending on IDE
- Code completion persistence: 92%

**Cursor IDE:**
- A/B testing infrastructure for comparing Claude vs GPT-4
- Real-time acceptance rate dashboards per model tier
- Latency budgets enforced: P95 <500ms or fallback to faster model

**OpenAI Codex (internal):**
- Acceptance rate as primary quality metric for model training
- Human evaluation on 500 sample completions per model version
- Automated tests: does completion execute without syntax errors?

**Monitoring dashboards (typical):**
1. **Real-time health**: Acceptance rate (10-min rolling), P95 latency, error rate
2. **Quality trends**: Daily acceptance rate, persistence rate, chars saved
3. **Model comparison**: Side-by-side metrics for A/B tests
4. **User segmentation**: Power users vs new users, languages, file types

**Automated quality checks:**
```python
# Alert if quality degrades
if current_acceptance_rate < baseline - 5%:
    alert("Acceptance rate dropped from 32% to 26%")
    rollback_deployment()

if p95_latency > 1000ms:
    alert("Latency spike detected")
    investigate_infrastructure()
```

**Human evaluation (gold standard):**
- Sample 100-500 completions weekly
- Engineers rate: correct, helpful, harmful
- Compare human ratings to acceptance rate (validate metric)

**Longitudinal studies:**
- Track user retention: do users keep using the feature?
- Engagement over time: completions per day per user
- Churn analysis: why do users disable autocomplete?

## Related Concepts
- `./prompt-engineering.md` — A/B test different prompts, measure acceptance rate
- `./model-tiering.md` — compare acceptance rate across tiers
- `./streaming-inference.md` — TTFT is critical metric for streaming
- `./llm-cost-optimization.md` — balance cost reduction vs acceptance rate
- `../observability/metrics.md` — general metrics collection infrastructure
