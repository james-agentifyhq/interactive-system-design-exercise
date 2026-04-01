# Browser Event Model

**What**: The DOM event system including event phases (capturing, target, bubbling), event delegation, and critical timing behaviors that affect UI interactions.

**When to use**: Any interactive UI requires understanding events; delegation is critical for performance with dynamic lists; event timing matters for focus/blur interactions (dropdowns, modals).

**Tradeoffs**: Event delegation improves performance but requires careful selector matching; understanding event phases prevents bugs but adds complexity; event timing edge cases can cause subtle UX bugs.

## How It Works

**Three event phases:**
```
┌─────────────────────────┐
│      document           │  ← 1. Capturing phase (top-down)
│  ┌──────────────────┐   │
│  │     parent       │   │
│  │  ┌───────────┐   │   │
│  │  │  target   │   │   │  ← 2. Target phase
│  │  └───────────┘   │   │
│  └──────────────────┘   │
└─────────────────────────┘
         ▲
         │ 3. Bubbling phase (bottom-up)
```

**Event phases example:**
```html
<div id="outer">
  <div id="inner">
    <button id="target">Click me</button>
  </div>
</div>

<script>
// Capturing phase (useCapture: true)
document.addEventListener('click', () => console.log('1: document capture'), true);
outer.addEventListener('click', () => console.log('2: outer capture'), true);
inner.addEventListener('click', () => console.log('3: inner capture'), true);

// Target phase
target.addEventListener('click', () => console.log('4: target'));

// Bubbling phase (default)
inner.addEventListener('click', () => console.log('5: inner bubble'));
outer.addEventListener('click', () => console.log('6: outer bubble'));
document.addEventListener('click', () => console.log('7: document bubble'));

// Output when clicking button:
// 1: document capture
// 2: outer capture
// 3: inner capture
// 4: target
// 5: inner bubble
// 6: outer bubble
// 7: document bubble
</script>
```

**Event delegation (performance optimization):**
```javascript
// BAD: Attach listener to every item (O(n) listeners)
items.forEach(item => {
  item.addEventListener('click', handleClick);
});

// GOOD: One listener on parent (O(1) listener)
parent.addEventListener('click', (e) => {
  const item = e.target.closest('.item');
  if (item) {
    handleClick(item);
  }
});

// React example:
function TodoList({ todos }) {
  const handleClick = (e) => {
    const id = e.target.closest('[data-todo-id]')?.dataset.todoId;
    if (id) toggleTodo(id);
  };

  return (
    <ul onClick={handleClick}>
      {todos.map(todo => (
        <li key={todo.id} data-todo-id={todo.id}>
          {todo.title}
        </li>
      ))}
    </ul>
  );
}
```

**stopPropagation vs preventDefault:**
```javascript
element.addEventListener('click', (e) => {
  // Stops event from bubbling to parent handlers
  e.stopPropagation();

  // Prevents default browser action (link navigation, form submit, etc.)
  e.preventDefault();
});

// Example: custom dropdown
dropdown.addEventListener('click', (e) => {
  e.stopPropagation(); // Don't close dropdown when clicking inside
});

document.addEventListener('click', () => {
  closeDropdown(); // Close when clicking outside
});
```

**Focus/blur events (don't bubble!):**
```javascript
// focus/blur don't bubble
input.addEventListener('focus', handleFocus);  // Only fires on input itself

// focusin/focusout DO bubble (use for delegation)
form.addEventListener('focusin', (e) => {
  console.log('Focused element:', e.target);
});

// React example: focus tracking
function Form() {
  const handleFocusIn = (e) => {
    e.target.classList.add('focused');
  };

  const handleFocusOut = (e) => {
    e.target.classList.remove('focused');
  };

  return (
    <form onFocus={handleFocusIn} onBlur={handleFocusOut}>
      <input name="email" />
      <input name="password" />
    </form>
  );
}
```

**Critical event timing: mousedown fires before blur:**
```javascript
// PROBLEM: Dropdown closes before click handler fires
<input onBlur={() => setOpen(false)} />
<div className="dropdown">
  <button onClick={handleSelect}>Option 1</button>  {/* Never fires! */}
</div>

// Timeline:
// 1. User clicks button
// 2. mousedown fires on button
// 3. input loses focus → blur fires → setOpen(false) → dropdown unmounts
// 4. click event fires on button → but button no longer exists!

// SOLUTION 1: Use mousedown instead of click
<button onMouseDown={handleSelect}>Option 1</button>

// SOLUTION 2: Delay blur with setTimeout
<input onBlur={() => setTimeout(() => setOpen(false), 0)} />

// SOLUTION 3: Check relatedTarget in blur handler
<input onBlur={(e) => {
  if (!dropdownRef.current?.contains(e.relatedTarget)) {
    setOpen(false);
  }
}} />
```

**Event timing edge cases:**
```javascript
// 1. Scroll fires very frequently (throttle it)
window.addEventListener('scroll', throttle(handleScroll, 100));

// 2. Resize fires on every pixel change (debounce it)
window.addEventListener('resize', debounce(handleResize, 300));

// 3. Input fires before change
input.addEventListener('input', (e) => console.log(e.target.value)); // Real-time
input.addEventListener('change', (e) => console.log(e.target.value)); // On blur

// 4. Submit fires before button click
form.addEventListener('submit', (e) => {
  e.preventDefault(); // Stop form submission
  handleSubmit();
});
```

**Synthetic events (React):**
```jsx
// React normalizes events across browsers
function handleClick(e) {
  // e is a SyntheticEvent wrapper around native event
  console.log(e.nativeEvent); // Access native event

  // Event pooling (React < 17): don't access async
  setTimeout(() => {
    console.log(e.target); // Error in React < 17 (event pooled)
  }, 100);

  // React 17+: no pooling, safe to access async
}

// React events always bubble (including focus/blur)
<div onFocus={handleFocus}>  {/* Uses focusin internally */}
  <input />
</div>
```

**Custom events:**
```javascript
// Dispatch custom event
const event = new CustomEvent('todoAdded', {
  detail: { id: 1, title: 'Buy milk' },
  bubbles: true,
  cancelable: true
});
element.dispatchEvent(event);

// Listen for custom event
document.addEventListener('todoAdded', (e) => {
  console.log('Todo added:', e.detail);
});
```

## Complexity / Performance

**Event delegation:**
- Listeners: O(1) instead of O(n)
- Memory: Significantly less (one listener vs thousands)
- Caveat: Slightly slower event handling (selector matching)

**Event bubbling:**
- Depth: O(d) where d = DOM depth
- Usually negligible (modern browsers optimize)

**Passive event listeners (performance):**
```javascript
// Tells browser event won't call preventDefault
// Allows browser to scroll immediately without waiting
document.addEventListener('touchstart', handleTouch, { passive: true });

// React doesn't support passive by default, use ref:
useEffect(() => {
  const el = ref.current;
  el.addEventListener('touchstart', handleTouch, { passive: true });
  return () => el.removeEventListener('touchstart', handleTouch);
}, []);
```

**Event listener cleanup (memory leaks):**
```javascript
// Always clean up listeners
useEffect(() => {
  const handler = () => handleResize();
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);

// Especially important for:
// - window/document listeners
// - Third-party library events
// - setInterval/setTimeout
```

## Real-World Examples

**Event delegation libraries:**
- **delegate** (npm): Tiny event delegation library
- **jQuery**: `.on()` method uses delegation

**Common patterns:**
```jsx
// 1. Click outside to close (modals, dropdowns)
useEffect(() => {
  const handleClickOutside = (e) => {
    if (ref.current && !ref.current.contains(e.target)) {
      setOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

// 2. Keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.metaKey && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);

// 3. Escape key to close
useEffect(() => {
  const handleEscape = (e) => {
    if (e.key === 'Escape') setOpen(false);
  };
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, []);

// 4. Drag and drop
element.addEventListener('dragstart', handleDragStart);
element.addEventListener('dragover', (e) => e.preventDefault()); // Allow drop
element.addEventListener('drop', handleDrop);
```

**Production examples:**
- **Linear**: Command palette (Cmd+K), keyboard shortcuts
- **GitHub**: Code review comments (event delegation on file diffs)
- **Notion**: Block interactions (delegation for thousands of blocks)
- **Figma**: Canvas interactions (capturing phase for tool handlers)

**Browser differences (historical):**
```javascript
// Modern: addEventListener
element.addEventListener('click', handler);

// Old IE: attachEvent (no longer needed)
element.attachEvent('onclick', handler);

// React abstracts this away with SyntheticEvent
```

## Related Concepts

- `./accessibility-aria.md` — Keyboard events for accessible navigation
- `./debouncing-and-throttling.md` — Optimize scroll/resize event handlers
- `./virtual-lists.md` — Event delegation for virtual list items
- `./component-api-design.md` — Event callbacks in component APIs
