# Debouncing and Throttling

**What**: Rate-limiting techniques that control how often a function executes in response to frequent events.

**When to use**: Search inputs (debounce), scroll handlers (throttle), window resize (throttle), API calls triggered by user input (debounce).

**Tradeoffs**: Debounce provides better UX for text input but delays execution; throttle ensures regular updates but may fire unnecessarily.

## How It Works

**Debouncing** waits for a quiet period before executing:
```javascript
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Usage: only search after user stops typing for 300ms
const searchDebounced = debounce(search, 300);
input.addEventListener('input', searchDebounced);
```

**Throttling** caps execution frequency:
```javascript
function throttle(fn, interval) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

// Usage: update scroll position max once per 100ms
const handleScrollThrottled = throttle(handleScroll, 100);
window.addEventListener('scroll', handleScrollThrottled);
```

**Visual comparison:**
```
User types: a-b-c-d-e-----f-g---

Debounce(300ms):              ▼   ▼
                            fire fire

Throttle(200ms):  ▼     ▼     ▼     ▼
                fire  fire  fire  fire
```

## Complexity / Performance

**Debounce:**
- Time: O(1) per event
- Space: O(1) (stores one timeout ID)
- Latency: User waits delay ms after last input

**Throttle:**
- Time: O(1) per event
- Space: O(1) (stores last execution time)
- Latency: Max interval ms between updates

Both use `setTimeout`/`clearTimeout` which are lightweight browser APIs.

## Real-World Examples

**Debounce:**
- Google Search autocomplete (waits ~150-300ms after typing stops)
- Form validation (validate after user finishes typing)
- Auto-save drafts (save after editing pause)
- [Lesson learned from the project](../../autocomplete/genai/src/design-doc.md#lessons-learned-debouncing--streaming-pitfalls)

**Throttle:**
- Infinite scroll (check scroll position every 100-200ms)
- Window resize handlers (recalculate layout max 60fps)
- Mouse move tracking (update position every 16ms)
- Rate-limiting API calls (max 1 request per second)

**Libraries:**
- Lodash: `_.debounce()`, `_.throttle()`
- React hooks: `useDebouncedValue`, `useThrottle` from various libraries

## Related Concepts

- `./race-conditions.md` — Debouncing helps avoid race conditions in search
- `./offline-and-network.md` — Throttling useful for network status checks
- `./browser-event-model.md` — Applied to scroll, resize, mouse events
