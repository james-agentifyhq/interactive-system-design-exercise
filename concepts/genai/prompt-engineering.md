# Prompt Engineering

**What**: Designing effective prompts to guide LLM behavior and optimize output quality for specific tasks.
**When to use**: All LLM applications, especially autocomplete, code completion, and structured generation tasks.
**Tradeoffs**: Well-crafted prompts improve quality and reduce tokens, but require iteration and domain expertise.

## How It Works

Prompts structure the input to an LLM to elicit desired behavior:

**Components:**
1. **System prompt**: Sets role, constraints, output format
2. **Context**: Relevant information (code, docs, conversation history)
3. **Instruction**: What to do
4. **Examples**: Few-shot demonstrations (optional)
5. **User input**: The actual query/request

**For autocomplete/code completion:**

**Fill-in-the-Middle (FIM)**: Model completes text between prefix and suffix
```
<fim_prefix>
def calculate_total(items):
    total = 0
    for item in items:
<fim_suffix>
    return total
<fim_middle>
```
Model generates the loop body. Better than left-to-right for cursor-in-middle scenarios.

**Left-to-right**: Traditional completion from prompt
```
def calculate_total(items):
    total = 0
    for item in items:█
```
Model continues from cursor position.

**Context window budget allocation:**
- System prompt: 100-500 tokens
- Recent file content: 1000-2000 tokens
- Related files: 500-1000 tokens
- User input: 50-200 tokens
- Reserved for output: 256-1024 tokens

Total must fit in model's context window (4K-128K tokens depending on model).

**Stop sequences**: Tokens that signal completion end
- Code: `\n\n`, `}`
- Autocomplete: `\n`, end of sentence punctuation
- Prevents over-generation

**Temperature tuning:**
- **0.0**: Deterministic, best for code completion
- **0.3-0.5**: Slight variation, good for text suggestions
- **0.7-1.0**: Creative, for content generation (not autocomplete)

**Few-shot examples:** Show model desired behavior
```
System: Complete code following these patterns:

# Example 1
Input: def add(a, b):
Output:     return a + b

# Example 2
Input: class User:
    def __init__(self, name):
Output:         self.name = name

# Now complete:
Input: def multiply(x, y):
Output:
```

**Chain-of-thought**: For complex reasoning (less common in autocomplete)
```
Think step by step:
1. Analyze the context
2. Identify the pattern
3. Generate completion
```

## Complexity / Performance

**Prompt length impact on latency:**
- Linear relationship: 2x tokens ≈ 2x TTFT
- Typical autocomplete prompt: 500-2000 tokens (50-200ms encoding)
- Keep prompts minimal while preserving quality

**Token cost:**
- Input tokens: $0.003-0.015 per 1K tokens
- Output tokens: $0.015-0.075 per 1K tokens
- Shorter prompts = lower cost

**Quality vs efficiency:**
- More context → better quality, higher latency/cost
- Find minimum viable context through A/B testing

**Caching prefixes:**
- If system prompt + file context is reused, many providers cache prompt prefixes
- Reduces cost and latency for subsequent requests

## Real-World Examples

**GitHub Copilot**: FIM prompts with surrounding code context (20-50 lines before/after cursor). Temperature 0.0 for deterministic completions. Aggressive stop sequences to prevent over-generation.

**Cursor IDE**: Multi-file context (imports, definitions) included in prompt. Uses embedding similarity to select relevant code snippets. Context budget: ~4K tokens.

**OpenAI Codex/GPT-4**: System prompt sets language and style. Example:
```
You are a Python code completion engine. Complete code naturally and concisely.
Only return the completion, no explanations.
```

**Anthropic Claude Code**: Extended context window (100K+ tokens) allows including entire file + related files. Uses special XML tags for structure:
```xml
<file path="main.py">
...code...
</file>
<cursor_position>line 42, column 15</cursor_position>
Complete the code at cursor position.
```

**Tabnine**: Language-specific prompts with ML-selected context from open files and semantic search results.

**Prompt optimization strategies:**
- A/B test different system prompts for acceptance rate
- Incrementally add context only when needed
- Use prompt caching for static portions
- Monitor token usage distribution to find waste

## Related Concepts
- `./llm-cost-optimization.md` — prompt length as cost lever
- `./model-tiering.md` — simpler prompts for smaller models
- `./rag.md` — retrieving context to inject into prompts
- `./evaluation-metrics.md` — measuring prompt effectiveness
- `./streaming-inference.md` — delivering prompt-generated output
