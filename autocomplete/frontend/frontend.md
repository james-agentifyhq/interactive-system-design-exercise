# Autocomplete

Autocomplete surfaces in nearly every frontend system design interview. It touches on component API design, caching, performance optimization, accessibility, and network handling — making it an excellent foundation for broader frontend design thinking.

## Question
Design a reusable autocomplete component. A user types into a text field, a dropdown of matching results appears, and they can select one. Assume a backend search API already exists.

You've likely used this pattern before:

- Google Search — primarily text suggestions as you type.
- Facebook Search — rich, mixed-type results (people, pages, groups).

```
┌─────────────────────────────────────┐
│  🔍  new york ti|                   │
├─────────────────────────────────────┤
│  new york times                     │
│  new york times crossword           │
│  new york times wordle              │
│  new york time zone                 │
│  new york times cooking             │
└─────────────────────────────────────┘
```

## Requirements

- The component must be reusable across different applications and contexts.
- Both the input field and the results display should support visual customization.

### Requirements exploration
Clarifying questions to sharpen the scope before diving into design.

#### What result types should the component handle?
Text, images, and media (image + text) are the most common, but the component shouldn't hard-code assumptions about result format — future consumers may need entirely different layouts.

#### Which devices does it need to work on?
Desktop, tablet, and mobile — the component should adapt to all viewport sizes.

#### Should we handle fuzzy matching?
Out of scope for the initial design. Worth revisiting if time permits.

## Architecture

```
                        ┌──────────────┐
                        │  Backend API │
                        └──────┬───────┘
                               │
                          HTTP request/
                           response
                               │
┌──────────┐           ┌───────▼───────┐           ┌──────────┐
│  Input   │──query──▶ │  Controller   │ ◀──hit/──▶│  Cache   │
│  Field   │           │    (MVC)      │   miss    │          │
└──────────┘           └───────┬───────┘           └──────────┘
                               │
                            results
                               │
                        ┌──────▼───────┐
                        │  Results UI  │
                        │   (Popup)    │
                        └──────────────┘
```

- Input field UI
  - Captures keystrokes and forwards the current query to the controller.
- Results UI (Popup)
  - Renders the suggestion list provided by the controller.
  - Reports back to the controller when the user selects an item.
- Cache
  - Retains results from earlier queries so the controller can skip redundant network calls.
- Controller
  - Central coordinator, modeled after the Controller in MVC. Every other component communicates through it.
  - Routes user input to either the cache or the network layer.
  - Delivers results to the Results UI for rendering.

## Data model

- Controller
  - Configuration options passed in via the component API
  - The active query string
- Cache
  - Pre-loaded (initial) results
  - Previously fetched results
  - See the cache section below for detailed structure options

These represent the minimum fields for core functionality. Additional state is introduced in the deep-dive sections.

## Interface definition (API)
Because this is a frontend design problem, the component's public API is the primary focus. The server API is covered briefly for completeness.

### Client
A reusable component can't predict every use case, so the API surface needs to be broad enough to cover common scenarios without being overwhelming.

#### Basic API
Core options that control the component's fundamental behavior.

- Number of results: How many suggestions to display at once.
- API URL: The endpoint to query when the user types. Requests fire as the input changes.
- Event callbacks: Hooks for common events — `input`, `focus`, `blur`, `change`, `select` — so consumers can add logging, analytics, or custom behavior.
- Customized rendering: Three approaches, each trading simplicity for flexibility:
  - Theming object: A key-value configuration (e.g., `{ fontSize: '14px', color: '#333' }`) applied by the component. Easiest to use, least flexible.
  - CSS class overrides: Consumers pass class names that get applied to internal sub-components. More control over visual styling.
  - [Render function/callback](../../concepts/frontend/component-api-design.md): The consumer provides a function that receives result data and returns the rendered output. This inversion of control gives full layout flexibility but shifts more work to the consumer. Common in React via render props or children-as-function patterns.

#### Advanced API
Options that improve UX and performance — important but secondary to the core behavior.

- Minimum query length: Avoid firing searches for very short inputs (e.g., a single character) that produce too many irrelevant results. A threshold of 3 characters is typical.
- [Debounce](../../concepts/frontend/debouncing-and-throttling.md) duration: Delays the API call until the user stops typing for a set period (e.g., 300ms). Prevents firing a request per keystroke, which wastes bandwidth and server resources — especially for the first few characters where results are rarely useful.
- Request timeout: Maximum wait time before treating a request as failed and showing an error state.
- Cache-related options (detailed in the cache section):
  - Initial/seed results
  - Data source strategy: network only / network + cache / cache only
  - Custom merge function for combining server and cached results
  - Time-to-live for cache entries

### Server API
The backend should expose an HTTP endpoint accepting:

- query: The search string
- limit: Maximum results per response
- pagination: Page offset for loading additional results

Pagination and limit support lazy-loading — useful when users scroll past the initial result set.

## Optimizations and deep dive
With the core design established, let's examine the details that separate a functional component from a production-quality one.

### Network

#### Handling concurrent requests/[race conditions](../../concepts/frontend/race-conditions.md)
When a user types quickly, multiple requests can be in-flight simultaneously. The challenge: responses don't necessarily arrive in the order they were sent. A response for an older query ("fa") might arrive after one for a newer query ("face"), causing stale results to overwrite fresh ones.

Two strategies to handle this:

1. Tag each request with a timestamp and only render results from whichever request was most recently *sent* (not most recently *received*). Discard everything else.
2. Store every response in a map keyed by query string. Always display whichever entry matches the current input value.

Option 2 is strictly better because the stored responses double as a cache. If the user deletes a character (e.g., "face" → "fac"), cached results for "fac" appear instantly.

Aborting in-flight requests via `AbortController` is tempting but generally wasteful — the server has already processed the request by the time you cancel it, so you might as well cache the response.

The cache-as-you-type approach also handles the "fat finger" scenario well: the user types "foot" → "footr" (typo) → backspaces to "foot" — and gets instant results because "foot" is already cached. This benefit is most noticeable for components without debouncing or for slower typists.

#### Failed requests and retries
Network requests can fail due to connectivity issues. The component should retry automatically, but to avoid overwhelming a struggling server, use an [exponential backoff](../../concepts/retry-and-backoff.md) strategy — increasing the delay between each successive retry.

#### [Offline usage](../../concepts/frontend/offline-and-network.md)
When the device has no connection, options are limited since the component depends on a server. Reasonable fallbacks:
- Serve results from the local cache (limited value if the cache is cold).
- Stop firing network requests to avoid wasted processing.
- Show a connectivity warning within the component UI.

### [Cache](../../concepts/caching.md)
The cache stores results from previous queries in memory so repeated searches can be served instantly without a round-trip to the server. This eliminates network latency for known queries and reduces server load. Major search products (Google, Facebook) all cache aggressively on the client side.

### Cache structure
How you structure the cache has significant implications for memory usage, lookup speed, and data freshness. There are three main approaches, each with distinct tradeoffs.

1. **Query-keyed hash map** — Maps each query string directly to its result array. Lookup is O(1) and the implementation is straightforward.

```typescript
const cache = {
  fa: [
    { type: 'organization', text: 'Facebook' },
    {
      type: 'organization',
      text: 'FasTrak',
      subtitle: 'Government office, San Francisco, CA',
    },
    { type: 'text', text: 'face' },
  ],
  fac: [
    { type: 'organization', text: 'Facebook' },
    { type: 'text', text: 'face' },
    { type: 'text', text: 'facebook messenger' },
  ],
  face: [
    { type: 'organization', text: 'Facebook' },
    { type: 'text', text: 'face' },
    { type: 'text', text: 'facebook stock' },
  ],
  faces: [
    { type: 'television', text: 'Faces of COVID', subtitle: 'TV program' },
    { type: 'musician', text: 'Faces', subtitle: 'Rock band' },
    { type: 'television', text: 'Faces of Death', subtitle: 'Film series' },
  ],
  // ...
};
```
The downside: result objects are duplicated across overlapping queries. Without debouncing (one request per keystroke), memory usage grows quickly from redundant data.

2. **Flat result list** — Store all results in a single array and filter client-side per query. Eliminates duplication entirely.

```typescript
const results = [
  { type: 'company', text: 'Facebook' },
  {
    type: 'organization',
    text: 'FasTrak',
    subtitle: 'Government office, San Francisco, CA',
  },
  { type: 'text', text: 'face' },
  { type: 'text', text: 'facebook messenger' },
  { type: 'text', text: 'facebook stock' },
  { type: 'television', text: 'Faces of COVID', subtitle: 'TV program' },
  { type: 'musician', text: 'Faces', subtitle: 'Rock band' },
  { type: 'television', text: 'Faces of Death', subtitle: 'Film series' },
];
```

The problem: client-side filtering on every keystroke can block the main thread, particularly with large datasets or slower devices. You also lose the server's relevance ranking.

3. **[Normalized](../../concepts/frontend/normalized-cache.md) map** — Inspired by database normalization (and libraries like normalizr). Results are stored once in a flat lookup table keyed by ID. The cache maps query strings to arrays of IDs rather than full objects.

```typescript
// Each result stored exactly once, keyed by ID.
const results = {
  1: { id: 1, type: 'organization', text: 'Facebook' },
  2: {
    id: 2,
    type: 'organization',
    text: 'FasTrak',
    subtitle: 'Government office, San Francisco, CA',
  },
  3: { id: 3, type: 'text', text: 'face' },
  4: { id: 4, type: 'text', text: 'facebook messenger' },
  5: { id: 5, type: 'text', text: 'facebook stock' },
  6: {
    id: 6,
    type: 'television',
    text: 'Faces of COVID',
    subtitle: 'TV program',
  },
  7: { id: 7, type: 'musician', text: 'Faces', subtitle: 'Rock band' },
  8: {
    id: 8,
    type: 'television',
    text: 'Faces of Death',
    subtitle: 'Film series',
  },
};

// Cache stores only ID references, not duplicated objects.
const cache = {
  fa: [1, 2, 3],
  fac: [1, 3, 4],
  face: [1, 3, 5],
  faces: [6, 7, 8],
  // ...
};
```

This combines O(1) lookup with zero data duplication. The tradeoff is a small resolution step — mapping IDs back to result objects before rendering — but this is negligible for typical result set sizes.

### Which structure to use?

The right choice depends on page lifecycle:

- **Short-lived pages** (e.g., Google search): Option 1 (hash map) is sufficient. Users navigate away after selecting a result, so the cache is short-lived and duplication doesn't accumulate to problematic levels.
- **Long-lived SPAs** (e.g., Facebook): Option 3 (normalized map) pays off. In a single-page app where the component may be used repeatedly over a long session, avoiding data duplication keeps memory usage predictable. Still, be careful about caching results indefinitely — stale entries waste memory without providing value.

### Initial results
Google shows trending queries and your search history before you type anything. Facebook shows recent searches. Stock trading apps might show trending tickers or your watchlist.

This "zero-query" state improves the experience by saving keystrokes and reducing server load. Implementation is straightforward: store the initial results in the cache under an empty-string key.

Facebook historically pre-loaded the user's friend list, pages, and groups into the browser cache so results could appear instantly through client-side filtering alone.

Source: [The Life of a Typeahead Query](https://engineering.fb.com/2010/05/17/web/the-life-of-a-typeahead-query/)

### Caching strategy
Caching trades memory for speed. But stale cache entries consume memory without delivering value, so eviction policy matters.

The right TTL depends on how frequently the underlying data changes:

- **Google**: Search results are relatively stable — a long TTL (hours) works well.
- **Facebook**: Social content updates more frequently — a shorter TTL (around 30 minutes) keeps results fresh without losing the caching benefit.
- **Financial data**: Stock prices and exchange rates change by the minute — caching may be counterproductive when markets are open.

Expose this as component configuration:
- **Data source**: `"network-only"` / `"network-and-cache"` / `"cache-only"` — controls where results come from.
- **Cache TTL**: How long before an entry expires. Requires timestamping each entry and periodically evicting stale ones.

### Performance
This section focuses on client-side performance; server response time is outside the component's control.

#### Loading speed
Client-side caching enables instant display of previously-seen results. Taken further, cached results for overlapping queries can even serve as provisional results for new queries until the server responds.

#### [Debouncing/throttling](../../concepts/frontend/debouncing-and-throttling.md)
Rate-limiting outbound requests reduces both server load and unnecessary client-side processing.

#### Memory usage
In long-lived pages, the cache can grow unbounded as users issue more queries. Implement a purge strategy — evict entries when the browser is idle, when total entry count exceeds a threshold, or when memory pressure is detected.

#### [Virtualized lists](../../concepts/frontend/virtual-lists.md)
When the result set is large (hundreds or thousands of items), rendering every DOM node is expensive. List virtualization solves this by only rendering the items currently visible in the viewport.

From [web.dev](https://web.dev/virtualize-long-lists-react-window):
> List virtualization, or "windowing", is the concept of only rendering what is visible to the user. The number of elements that are rendered at first is a very small subset of the entire list and the "window" of visible content moves when the user continues to scroll. This improves both the rendering and scrolling performance of the list.

The technique works by rendering only visible items and using placeholder elements (sized to match off-screen items) to maintain correct scroll height. DOM nodes are recycled as the user scrolls rather than created and destroyed.

### User experience
Practical UX considerations that elevate the component from functional to polished.

#### Autofocus
Use the `autofocus` attribute when the search input is the page's primary action (like Google's homepage). Only do this when the user's intent to search is near-certain — unexpected focus can be disorienting.

#### Handle different states
- Loading: Display a spinner or skeleton while waiting for server results.
- Error: Show an error message with a retry action.
- No network: Indicate the connectivity issue directly in the component.

#### Handle long strings
Result text that exceeds the container width should be truncated with an ellipsis or wrapped gracefully. Content should never overflow the component boundaries.

#### Mobile-friendliness
- Tap targets should be large enough for touch interaction.
- Consider adapting the visible result count to the viewport height (though this is often better left to the consuming application).
- Disable browser input behaviors that interfere with search: `autocapitalize="off"`, `autocomplete="off"`, `autocorrect="off"`, `spellcheck="false"`.

#### Keyboard interaction
- Full keyboard navigation through results should work without requiring a mouse. Details in the Accessibility section.
- A global shortcut (commonly `/`) can focus the search input instantly — a pattern used by Facebook, X, and YouTube.

#### Typos in search
Typos are common, especially on mobile. Fuzzy matching finds results that are close to but don't exactly match the query. This can be implemented client-side using edit distance algorithms (e.g., Levenshtein distance) to rank results by similarity. For server-side search, the query is sent as-is and fuzzy matching happens on the backend.

#### Query results positioning
Suggestions usually render below the input, but if the component sits near the bottom of the viewport, there may not be enough space. The popup should detect its position and flip above the input when needed — a pattern sometimes called "auto-placement."

### [Accessibility](../../concepts/frontend/accessibility-aria.md)

#### Screen readers
- Prefer semantic HTML (`<ul>`, `<li>`) for the result list, or use `role="listbox"` and `role="option"` on non-semantic elements.
- Add `aria-label` to the `<input>` since a visible label is typically absent.
- Apply `role="combobox"` to the `<input>`.
- Use `aria-haspopup` to signal that the input triggers a popup.
- Toggle `aria-expanded` to reflect whether the suggestion list is currently visible.
- Add `aria-live` to the results region so screen readers announce updates when new suggestions load.
- Set `aria-autocomplete` to describe the completion behavior — `"inline"` for single-value completion, `"list"` for a dropdown of options.
  - Google uses `aria-autocomplete="both"` while Facebook and X use `aria-autocomplete="list"`.

#### Keyboard interaction

- Enter submits the search. Wrapping the `<input>` in a `<form>` provides this natively.
- Up/down arrow keys cycle through suggestions, wrapping at the list boundaries.
- Escape dismisses the results popup.
- Follow the WAI-ARIA Combobox pattern for complete keyboard behavior.

Below is a comparison of how Google, Facebook, and X implement their search autocomplete — illustrating that there's no single standardized approach to ARIA attributes.


| HTML Attribute          | Google       | Facebook            | X                |
| ----------------------- | ------------ | ------------------- | ---------------- |
| HTML Element            | `<textarea>` | `<input>`           | `<input>`        |
| Within `<form>`         | Yes          | No                  | Yes              |
| `type`                  | `"text"`     | `"search"`          | `"text"`         |
| `autocapitalize`        | `"off"`      | Absent              | `"sentence"`     |
| `autocomplete`          | `"off"`      | `"off"`             | `"off"`          |
| `autocorrect`           | `"off"`      | Absent              | `"off"`          |
| `autofocus`             | Present      | Absent              | Present          |
| `placeholder`           | Absent       | `"Search Facebook"` | `"Search"`       |
| `role`                  | `"combobox"` | Absent              | `"combobox"`     |
| `spellcheck`            | `"false"`    | `"false"`           | `"false"`        |
| `aria-activedescendant` | Present      | Absent              | Present          |
| `aria-autocomplete`     | `"both"`     | `"list"`            | `"list"`         |
| `aria-expanded`         | Present      | Present             | Present          |
| `aria-haspopup`         | `"false"`    | Absent              | Absent           |
| `aria-invalid`          | Absent       | `"false"`           | Absent           |
| `aria-label`            | `"Search"`   | `"Search Facebook"` | `"Search query"` |
| `aria-owns`             | Present      | Absent              | Present          |
| `dir`                   | Absent       | `"ltr"`/`"rtl"`     | `"auto"`         |
| `enterkeyhint`          | Absent       | Absent              | `"search"`       |

Note: This comparison reflects a point-in-time snapshot — companies regularly update their search implementations. The key takeaway is that ARIA implementation varies significantly across major products.


## References
- [The Life of a Typeahead Query](https://engineering.fb.com/2010/05/17/web/the-life-of-a-typeahead-query/)
- [Building an accessible autocomplete control](https://adamsilver.io/blog/building-an-accessible-autocomplete-control/)
