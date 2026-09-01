import { useEffect, useState } from "react";

/**
 * A value that settles instead of tracking every keystroke.
 *
 * Typing "charlie" is seven renders and, when the value keys a query, seven
 * requests for six answers nobody reads. The returned value catches up once
 * the typing pauses.
 */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
