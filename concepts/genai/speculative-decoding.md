# Speculative Decoding

**What**: Using a small draft model to generate candidate tokens quickly, then verifying them with a large model in parallel to achieve 2-4x speedup.
**When to use**: Latency-critical LLM inference where you need large model quality at small model speed.
**Tradeoffs**: 2-4x faster inference vs increased system complexity and memory requirements for running two models.

## How It Works

Standard autoregressive decoding is slow because each token requires a full forward pass through the large model. Speculative decoding parallelizes verification:

1. **Draft phase**: Small fast model generates K candidate tokens (typically 4-8)
2. **Verification phase**: Large model evaluates all K candidates in one forward pass
3. **Acceptance**: Accept longest prefix where large model agrees with draft
4. **Correction**: If draft diverges, use large model's token and repeat

```
Standard decoding (sequential):
Large model → token 1 (300ms)
Large model → token 2 (300ms)
Large model → token 3 (300ms)
Total: 900ms for 3 tokens

Speculative decoding (parallel):
Small model → candidates [tok1, tok2, tok3, tok4] (50ms)
Large model → verify all 4 in parallel (300ms)
Accept first 3 (match), reject 4th
Total: 350ms for 3 tokens (2.5x faster)
```

**Key requirement**: Draft model must produce similar token distribution to large model (same family, distilled version, or quantized).

**KV cache reuse**: Both models share cached key-value pairs for the prefix, avoiding recomputation.

**Acceptance rate**: Percentage of draft tokens accepted. Higher = better speedup. Typically 60-80% for well-matched models.

**Related techniques:**

**Quantization**: Reduce precision (FP32 → INT8 → INT4) for faster draft model
- INT8: 2x faster, minimal quality loss
- INT4: 3-4x faster, some quality degradation

**Medusa heads**: Multiple draft heads predict different token positions simultaneously, increasing parallelism.

**Lookahead decoding**: Draft model looks ahead multiple positions, creating a beam of candidates.

## Complexity / Performance

**Speedup**: 2-4x typical, depends on:
- Draft model speed vs large model speed
- Acceptance rate (higher = better)
- Number of speculative tokens (K)

**Memory overhead**: Running two models simultaneously requires:
- Draft model memory (e.g., 2GB for small model)
- Large model memory (e.g., 16GB for 7B parameter model)
- Shared KV cache

**Optimal K (speculation depth)**:
- Too small (K=2): Limited speedup
- Too large (K=10): More rejections, wasted work
- Sweet spot: K=4-6 for most scenarios

**Latency breakdown** (example):
- Standard: 300ms/token × 20 tokens = 6000ms
- Speculative: (50ms draft + 300ms verify) × 5 rounds = 1750ms (3.4x faster)

**Hardware requirements**:
- GPU memory for both models
- High memory bandwidth for KV cache access
- Works best on single GPU (avoid inter-GPU communication)

**Diminishing returns**: Works best for medium-length sequences (10-50 tokens). Very short sequences don't benefit (overhead). Very long sequences hit memory limits.

## Real-World Examples

**Google DeepMind research**: Original speculative decoding paper (2023) showed 2-3x speedup on translation and summarization tasks.

**Hugging Face Transformers**: `assisted_generation` API implements speculative decoding with draft model parameter.

**vLLM**: Production inference engine supports speculative decoding with automatic draft model selection.

**Together AI**: Offers speculative decoding as optimization for hosted models, transparent to users.

**Meta's Llama inference**: Llama-7B as draft, Llama-70B as target. 2.5x speedup with 75% acceptance rate.

**Code completion scenario**:
- Draft: CodeGen-350M (50ms)
- Target: CodeGen-6B (400ms)
- Speculate 5 tokens per round
- Effective: 80-100 tokens/second vs 30 tokens/second baseline

**Production implementation patterns:**
```python
# Simplified pseudocode
def speculative_decode(prompt, large_model, draft_model, K=5, max_tokens=50):
    generated = []
    context = prompt

    while len(generated) < max_tokens:
        # Draft K candidates
        candidates = draft_model.generate(context, num_tokens=K)

        # Verify all K in parallel with large model
        verified = large_model.verify_batch(context, candidates)

        # Find longest matching prefix
        accepted = 0
        for i in range(K):
            if verified[i] == candidates[i]:
                accepted += 1
            else:
                break

        # Accept verified tokens
        generated.extend(verified[:accepted+1])
        context = prompt + generated

    return generated
```

**Quantization for draft models**: INT4 quantization of draft model provides 3-4x faster draft generation with minimal impact on acceptance rate. Tools: llama.cpp, GPTQ, AWQ.

**When it works well:**
- Model pairs from same family (GPT-3.5 → GPT-4, Llama-7B → Llama-70B)
- Tasks with predictable patterns (code, structured output)
- Sufficient GPU memory for both models

**When it doesn't help:**
- Models are too different (low acceptance rate)
- Very short generations (overhead dominates)
- Memory-constrained environments (can't fit both models)

## Related Concepts
- `./streaming-inference.md` — speculative decoding improves streaming speed
- `./model-tiering.md` — similar cost/quality tradeoff, different mechanism
- `./llm-cost-optimization.md` — speedup reduces cost for self-hosted inference
- `../backend/caching.md` — KV cache reuse principle
- `./prompt-engineering.md` — draft model needs similar prompt format
