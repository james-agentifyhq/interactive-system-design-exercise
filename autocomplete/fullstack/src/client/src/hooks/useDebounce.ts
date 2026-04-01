/**
 * useDebounce Hook — delays updating a value until the user stops changing it.
 *
 * WHY DEBOUNCE?
 * Without debouncing, every keystroke fires an API request:
 *   "s" → API call
 *   "sa" → API call
 *   "san" → API call
 *   "san " → API call
 *   "san f" → API call
 *
 * With 300ms debounce, only the LAST value is used (if the user types fast):
 *   "s" → wait...
 *   "sa" → wait...
 *   "san" → wait...
 *   "san " → wait...
 *   "san f" → 300ms passes → API call for "san f"
 *
 * This reduces server load dramatically. A user typing "san francisco" at
 * normal speed generates ~13 requests without debounce, but only 1-2 with it.
 *
 * DEBOUNCE vs THROTTLE:
 * - Debounce: Wait until the user STOPS doing something, then act once.
 *   Best for: search input, form validation, window resize
 * - Throttle: Act at most once every N ms, even if the user keeps going.
 *   Best for: scroll handlers, mouse move, rate limiting
 *
 * For autocomplete, debounce is better because we only care about the
 * FINAL query the user intended to type, not intermediate states.
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timer to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    // If the value changes before the delay is up, cancel the previous timer.
    // This is the core of debouncing: each new keystroke resets the clock.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
