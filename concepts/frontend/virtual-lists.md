# Virtual Lists

**What**: A rendering technique that only creates DOM nodes for visible items in a long list, dramatically improving performance for large datasets.

**When to use**: Lists with 1000+ items, infinite scroll, data tables, chat histories, file explorers, dropdown menus with many options.

**Tradeoffs**: Near-constant rendering performance regardless of list size, but adds complexity (scroll handling, dynamic heights, accessibility) and may break browser search (Cmd+F).

## How It Works

**Naive approach (slow):**
```jsx
// Renders 10,000 DOM nodes
<div>
  {items.map(item => <div key={item.id}>{item.name}</div>)}
</div>
```

**Virtual list approach:**
```jsx
// Only renders ~20 visible DOM nodes
<div style={{ height: 600, overflow: 'auto' }} onScroll={handleScroll}>
  {/* Spacer for items above viewport */}
  <div style={{ height: startIndex * itemHeight }} />

  {/* Only render visible items */}
  {visibleItems.map(item => (
    <div key={item.id} style={{ height: itemHeight }}>
      {item.name}
    </div>
  ))}

  {/* Spacer for items below viewport */}
  <div style={{ height: (totalItems - endIndex) * itemHeight }} />
</div>
```

**Core algorithm:**
```javascript
function calculateVisibleRange(scrollTop, viewportHeight, itemHeight, totalItems) {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    totalItems,
    Math.ceil((scrollTop + viewportHeight) / itemHeight)
  );

  // Add overscan for smoother scrolling
  const overscan = 3;
  return {
    start: Math.max(0, startIndex - overscan),
    end: Math.min(totalItems, endIndex + overscan)
  };
}
```

**Visual diagram:**
```
┌──────────────────┐
│ Item 0 (hidden)  │  ▲
│ Item 1 (hidden)  │  │ Spacer div
│ ...              │  │ height = startIndex × itemHeight
├──────────────────┤  ▼
│ Item 98          │  ▲
│ Item 99          │  │
│ Item 100         │  │ Visible viewport
│ Item 101         │  │ (rendered DOM nodes)
│ Item 102         │  │
├──────────────────┤  ▼
│ Item 103 (hidden)│  ▲
│ ...              │  │ Spacer div
│ Item 9999        │  │ height = (total - endIndex) × itemHeight
└──────────────────┘  ▼
```

**Dynamic heights (harder):**
```javascript
// Measure and cache item heights
const heightCache = new Map();

function getItemHeight(index) {
  if (!heightCache.has(index)) {
    // Render off-screen to measure, or use estimates
    heightCache.set(index, measuredHeight);
  }
  return heightCache.get(index);
}

// Calculate offset using cached heights
function getOffsetForIndex(index) {
  let offset = 0;
  for (let i = 0; i < index; i++) {
    offset += getItemHeight(i);
  }
  return offset;
}
```

## Complexity / Performance

**Rendering:**
- Naive list: O(n) DOM nodes, O(n) render time
- Virtual list: O(v) DOM nodes where v = visible count (~10-50)
- Constant O(1) render time regardless of total items

**Scroll handling:**
- Fixed heights: O(1) calculation per scroll
- Dynamic heights: O(n) first pass to measure, O(1) with cache
- Browser-native scroll: smooth 60fps

**Memory:**
- Naive: O(n) DOM nodes in memory
- Virtual: O(v) DOM nodes + O(n) data in JavaScript (lightweight)

**Typical performance:**
- 10,000 items: 60fps scroll (vs 5fps naive)
- 100,000 items: Still 60fps
- 1,000,000 items: JavaScript data structure becomes bottleneck

## Real-World Examples

**Libraries:**
- **react-window**: Lightweight, fixed/variable heights, horizontal/grid
- **react-virtuoso**: Feature-rich, auto-height, reverse scroll (chat)
- **TanStack Virtual**: Framework-agnostic, headless, dynamic heights
- **react-virtualized**: Original library (larger, more features, deprecated)

**Production usage:**
- **VSCode**: File explorer, search results (Electron uses virtual lists)
- **Slack**: Message history (reverse virtual list)
- **Twitter**: Infinite scroll timeline
- **Gmail**: Email list view
- **Notion**: Long documents with many blocks
- **Figma**: Layers panel with thousands of objects

**Example (react-window):**
```jsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={10000}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>Item {index}</div>
  )}
</FixedSizeList>
```

**Example (TanStack Virtual):**
```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: 10000,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
  overscan: 5
});

<div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
  <div style={{ height: virtualizer.getTotalSize() }}>
    {virtualizer.getVirtualItems().map(item => (
      <div
        key={item.key}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${item.start}px)`
        }}
      >
        Item {item.index}
      </div>
    ))}
  </div>
</div>
```

## Related Concepts

- `./accessibility-aria.md` — Virtual lists need aria-rowcount, aria-rowindex
- `./browser-event-model.md` — Scroll event handling and delegation
- `./debouncing-and-throttling.md` — Throttle scroll handlers for dynamic heights
- `./component-api-design.md` — Render callbacks pattern for item customization
