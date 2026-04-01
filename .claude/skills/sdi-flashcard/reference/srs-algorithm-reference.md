# Spaced Repetition System (SRS) Algorithm Reference

## 1. SM-2 Algorithm (SuperMemo 2)

The most widely adopted SRS algorithm, created by Piotr Wozniak in 1987. Used as the basis for Anki (pre-v23) and many other flashcard systems.

### Parameters (per card)

| Parameter | Description | Initial Value |
|-----------|-------------|---------------|
| `n` | Repetition count (consecutive correct answers) | 0 |
| `EF` | Easiness Factor (difficulty multiplier) | 2.5 |
| `I` | Current interval in days | 0 |

### Quality Grade

Each review produces a quality response `q` from 0-5:

- **5** -- Perfect response, instant recall
- **4** -- Correct after hesitation
- **3** -- Correct with serious difficulty
- **2** -- Incorrect, but correct answer seemed easy to recall
- **1** -- Incorrect, remembered upon seeing answer
- **0** -- Complete blackout

A response of `q >= 3` counts as **correct**; `q < 3` is **incorrect**.

### Core Formulas

**Easiness Factor update** (applied after every review):

```
EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
EF  = max(1.3, EF')
```

This adjusts EF based on difficulty. Perfect answer (q=5) adds +0.1. Hard correct (q=3) subtracts -0.14. The floor of 1.3 prevents intervals from shrinking too aggressively.

**Interval calculation:**

```
if q >= 3 (correct):
    if n == 0:  I = 1       (first correct: review tomorrow)
    if n == 1:  I = 6       (second correct: review in 6 days)
    if n >= 2:  I = I * EF  (subsequent: multiply previous interval by EF)
    n = n + 1

if q < 3 (incorrect):
    n = 0                   (reset repetition count)
    I = 1                   (review tomorrow)
    EF remains unchanged    (keep current easiness factor)
```

### Step-by-step Process

1. Present card to user, collect quality grade `q` (0-5).
2. Update EF using the formula above (clamp to min 1.3).
3. Calculate next interval `I` based on `n` and `q`.
4. Set next review date = today + `I` days.
5. If `q < 3`, reset `n` to 0 (card re-enters learning phase).

### Minimum State Per Card (JSON)

```json
{
  "card_id": "uuid",
  "repetitions": 0,
  "easiness_factor": 2.5,
  "interval_days": 0,
  "next_review": "2026-04-01"
}
```

---

## 2. Leitner System

A simpler box-based approach using 3-5 numbered boxes with increasing review intervals.

### Mechanism

- All new cards start in **Box 1**.
- Each box has a fixed review interval (e.g., Box 1 = daily, Box 2 = 3 days, Box 3 = 7 days, Box 4 = 14 days, Box 5 = 30 days).
- **Correct answer**: card moves to the next box (longer interval).
- **Incorrect answer**: card returns to **Box 1** (most frequent review).

### Example Box Configuration

| Box | Review Interval |
|-----|----------------|
| 1   | Every day       |
| 2   | Every 3 days    |
| 3   | Every 7 days    |
| 4   | Every 14 days   |
| 5   | Every 30 days   |

Cards in Box 5 that are answered correctly can be considered "graduated" and retired or moved to a long-term pool (e.g., 90-day review).

### Minimum State Per Card

```json
{
  "card_id": "uuid",
  "box": 1,
  "next_review": "2026-04-01"
}
```

### Trade-offs vs SM-2

- Simpler to implement and reason about.
- Less adaptive -- all cards in the same box share the same interval regardless of individual difficulty.
- Harsh on mistakes (always back to Box 1).

---

## 3. FSRS (Free Spaced Repetition Scheduler)

Adopted by Anki v23.10+ as the default scheduler. Created by Jarrett Ye, based on the DSR (Difficulty, Stability, Retrievability) memory model.

### Core Concepts

- **Stability (S)**: Number of days for retrievability to drop to 90%. Higher = stronger memory.
- **Difficulty (D)**: Inherent difficulty of the card (1-10 scale).
- **Retrievability (R)**: Probability of successful recall, decays exponentially with time.

### How It Differs from SM-2

- Uses a **machine learning model** trained on millions of Anki reviews.
- Has 19 optimizable parameters (vs SM-2's single EF).
- Considers the **forgetting curve** shape, not just a linear multiplier.
- **Desired retention** is user-configurable (default 0.9 = 90% target recall).
- Interval is derived from: `I = S * (R^(1/decay) - 1)` where target R is typically 0.9.

### Minimum State Per Card

```json
{
  "card_id": "uuid",
  "stability": 1.0,
  "difficulty": 5.0,
  "last_review": "2026-03-31",
  "state": "learning"
}
```

### Practical Note

FSRS is significantly more complex to implement from scratch. For a lightweight CLI tool, SM-2 is the right choice. If you later want FSRS, use the `fsrs` npm/Python package rather than reimplementing it.

---

## Implementation Notes for CLI Flashcard System

### Recommended Simplifications to SM-2

1. **Use a 4-point scale instead of 0-5**: `again` (0), `hard` (2), `good` (3), `easy` (5). This maps well to keyboard input and covers the practical range.
2. **Round intervals** to whole days. Sub-day precision is unnecessary for a daily-use CLI tool.
3. **Add jitter** of +/- 5% to intervals to avoid clustering reviews on the same day.
4. **Cap max interval** at 365 days to ensure periodic review of all material.

### JSON File Structure

```json
{
  "version": 1,
  "algorithm": "sm2",
  "cards": [
    {
      "id": "uuid",
      "front": "What is the time complexity of binary search?",
      "back": "O(log n)",
      "repetitions": 3,
      "easiness_factor": 2.6,
      "interval_days": 15,
      "next_review": "2026-04-15",
      "created": "2026-03-01",
      "tags": ["algorithms"]
    }
  ]
}
```

### Review Queue Logic

1. Select all cards where `next_review <= today`.
2. Sort by `next_review` ascending (most overdue first).
3. New cards (never reviewed) can be interleaved with a configurable daily limit (e.g., 20 new cards/day).
