# Accessibility (ARIA)

**What**: Web Content Accessibility Guidelines (WCAG) implementation using ARIA (Accessible Rich Internet Applications) to make interactive web apps usable by screen readers and keyboard-only users.

**When to use**: Any interactive UI beyond basic HTML (dropdowns, modals, tabs, autocomplete, custom controls), or when semantic HTML alone is insufficient.

**Tradeoffs**: Essential for accessibility compliance and inclusive design, but adds complexity and requires careful testing with assistive technologies.

## How It Works

**Three pillars of accessibility:**
1. **Semantic HTML** (use `<button>`, `<nav>`, `<main>` not `<div>`)
2. **ARIA attributes** (roles, states, properties)
3. **Keyboard navigation** (focus management, shortcuts)

**Key ARIA roles:**
```html
<!-- Combobox (autocomplete/select) -->
<div role="combobox" aria-expanded="false" aria-controls="listbox-id">
  <input type="text" aria-autocomplete="list" />
</div>
<ul id="listbox-id" role="listbox">
  <li role="option" aria-selected="false">Option 1</li>
</ul>

<!-- Dialog (modal) -->
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Action</h2>
  <button>Cancel</button>
  <button>Confirm</button>
</div>

<!-- Tabs -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2">Tab 2</button>
</div>
<div id="panel-1" role="tabpanel">Content 1</div>
<div id="panel-2" role="tabpanel" hidden>Content 2</div>
```

**Key ARIA attributes:**
```html
<!-- Labels and descriptions -->
<button aria-label="Close dialog">×</button>
<input aria-describedby="password-hint" />
<div id="password-hint">Must be 8+ characters</div>

<!-- States -->
<button aria-pressed="true">Bold</button>  <!-- toggle button -->
<div aria-expanded="false">Collapsed section</div>
<input aria-invalid="true" aria-errormessage="error-1" />

<!-- Relationships -->
<input aria-activedescendant="option-3" />  <!-- which option is active -->
<div aria-owns="submenu-1 submenu-2" />     <!-- logical children -->

<!-- Live regions (dynamic content) -->
<div aria-live="polite">5 new messages</div>
<div aria-live="assertive">Error: Connection lost</div>
<div aria-atomic="true">Updated 2 minutes ago</div>
```

**Keyboard navigation patterns (WAI-ARIA):**
```
Dropdown/Combobox:
- Arrow Up/Down: navigate options
- Enter/Space: select option
- Escape: close without selecting
- Tab: move to next control

Dialog:
- Escape: close dialog
- Tab: cycle focus within dialog (trap focus)
- Focus returns to trigger on close

Tabs:
- Arrow Left/Right: switch tabs
- Home/End: first/last tab
- Tab: move to tab panel content
```

**Focus management example:**
```javascript
// Trap focus inside modal
function trapFocus(modalElement) {
  const focusableElements = modalElement.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  modalElement.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  });
}
```

**Screen reader announcements:**
```jsx
// Live region for dynamic updates
<div role="status" aria-live="polite" aria-atomic="true">
  {searchResults.length} results found
</div>

// Visually hidden but announced
<span className="sr-only">Loading...</span>
<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0,0,0,0);
    border: 0;
  }
</style>
```

## Complexity / Performance

**Development cost:**
- Additional attributes and focus management logic
- Testing with screen readers (NVDA, JAWS, VoiceOver)
- Keyboard-only testing

**Runtime performance:**
- Negligible: ARIA attributes don't affect rendering
- Focus management: O(1) for direct focus calls
- Live regions: Browser announces changes asynchronously

**Maintenance:**
- Must keep ARIA in sync with visual state
- Common bug: aria-expanded doesn't match actual visibility

## Real-World Examples

**Component libraries with accessibility:**
- **Radix UI**: Primitives with full ARIA support
- **Headless UI**: Tailwind's accessible components
- **Reach UI**: Accessible React components
- **Ariakit**: Toolkit for accessible UIs
- **React Spectrum**: Adobe's accessible design system

**WAI-ARIA Authoring Practices:**
- Official W3C guide: https://www.w3.org/WAI/ARIA/apg/
- Patterns: accordion, carousel, combobox, dialog, menu, tabs, tooltip, etc.

**Testing tools:**
- **axe DevTools**: Browser extension for accessibility audits
- **Lighthouse**: Automated accessibility scoring
- **WAVE**: Web accessibility evaluation tool
- **Screen readers**: NVDA (Windows), JAWS (Windows), VoiceOver (Mac/iOS)

**Production examples:**
- **GitHub**: Full keyboard navigation, ARIA labels on all controls
- **Linear**: Accessible command palette (Cmd+K), keyboard shortcuts
- **Vercel**: Accessible forms, error announcements
- **Stripe Dashboard**: Complex data tables with ARIA grid roles

**Common mistakes:**
```html
<!-- BAD: div pretending to be button -->
<div onclick="submit()">Submit</div>

<!-- GOOD: semantic button -->
<button onclick="submit()">Submit</button>

<!-- BAD: redundant role -->
<button role="button">Click me</button>  <!-- button already has button role -->

<!-- BAD: aria-label override -->
<button aria-label="Close">Save</button>  <!-- confusing: shows "Save" but announces "Close" -->
```

## Related Concepts

- `./component-api-design.md` — Designing accessible component APIs
- `./virtual-lists.md` — aria-rowcount, aria-rowindex for virtual lists
- `./browser-event-model.md` — focus/blur events, keyboard events
- `./state-management.md` — Keeping ARIA state in sync with app state
