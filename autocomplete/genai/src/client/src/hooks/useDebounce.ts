/**
 * useDebounce Hook — delays updating a value until the user stops changing it.
 *
 * Copied from fullstack/src/client/src/hooks/useDebounce.ts.
 * Same implementation — the GenAI demo uses 500ms (vs 300ms for traditional)
 * because LLM calls are more expensive and take longer.
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
