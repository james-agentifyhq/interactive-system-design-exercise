# Race Conditions

**What**: When asynchronous operations complete out of order, causing stale or incorrect data to override fresh data.

**When to use**: Any async operation where multiple requests can be in-flight simultaneously (search, autocomplete, infinite scroll, polling).

**Tradeoffs**: Solutions add complexity but prevent confusing UX bugs; choosing between cancellation (AbortController) vs ignoring stale responses (timestamps).

## How It Works

**The Problem:**
```javascript
// User types "react" quickly
searchInput.addEventListener('input', async (e) => {
  const results = await fetch(`/api/search?q=${e.target.value}`);
  displayResults(results); // BUG: slow "r" response may arrive after fast "react"
});

Timeline:
User types: r → re → rea → react
Request 1: -------- slow --------▼ (arrives LAST)
Request 2: ----- fast -----▼
Request 3: --- faster ---▼
Request 4: - fastest -▼

Display shows results for "r" instead of "react"!
```

**Solution 1: AbortController (cancellation)**
```javascript
let abortController = null;

async function search(query) {
  abortController?.abort(); // Cancel previous request
  abortController = new AbortController();

  try {
    const res = await fetch(`/api/search?q=${query}`, {
      signal: abortController.signal
    });
    displayResults(await res.json());
  } catch (err) {
    if (err.name === 'AbortError') return; // Ignore cancelled
    throw err;
  }
}
```

**Solution 2: Request keying/timestamps**
```javascript
let latestRequestId = 0;

async function search(query) {
  const requestId = ++latestRequestId;
  const results = await fetch(`/api/search?q=${query}`);

  if (requestId === latestRequestId) { // Ignore stale responses
    displayResults(results);
  }
}
```

**Solution 3: Query-keyed caching (TanStack Query approach)**
```javascript
// Library handles race conditions automatically
const { data } = useQuery({
  queryKey: ['search', query],
  queryFn: () => fetchSearch(query)
});
// Each query key maps to one result; out-of-order responses ignored
```

**Stale Closure Pitfall in React:**
```javascript
// BUG: closure captures old `query` value
const [query, setQuery] = useState('');

useEffect(() => {
  fetch(`/api/search?q=${query}`)
    .then(res => {
      // If query changed, this callback still has old query value
      displayResults(res);
    });
}, [query]);

// FIX: use AbortController or check current query value
```

## Complexity / Performance

**AbortController:**
- Time: O(1) to abort
- Network: Cancels in-flight request, saves bandwidth
- Best for: Rapid user input (search, autocomplete)

**Timestamp/keying:**
- Time: O(1) comparison
- Network: All requests complete (wastes bandwidth)
- Best for: Polling, background updates

**Caching approach:**
- Time: O(1) lookup in cache
- Network: May dedupe identical requests
- Best for: Complex data fetching with libraries

## Real-World Examples

- **Google Search**: Uses AbortController to cancel outdated autocomplete requests
- **TanStack Query**: Automatic stale request handling via query keys
- **Apollo Client**: Request deduplication and cache normalization
- **SWR**: Focus-based revalidation with race condition protection
- **Vercel's AI SDK**: Cancels previous streaming responses when new input arrives

**Common scenarios:**
1. Search autocomplete (cancel old searches)
2. Infinite scroll (ignore stale page fetches)
3. Real-time dashboards (display latest poll result)
4. Form autosave (don't overwrite newer save with older response)

## Related Concepts

- `./debouncing-and-throttling.md` — Debouncing reduces race condition likelihood
- `./normalized-cache.md` — Caching strategies that handle races
- `./state-management.md` — Managing async state correctly
- `./offline-and-network.md` — Network failures compound race issues
