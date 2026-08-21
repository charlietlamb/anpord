import type { UseMutationResult } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

/** Long enough that a typed word is one request rather than five, short enough
 * that the value is saved by the time attention moves on. */
const SAVE_DELAY_MS = 600;

interface DebouncedSaveOptions<TValue, TInput> {
  readonly mutation: UseMutationResult<unknown, Error, TInput>;
  readonly onError: (error: Error) => void;
  /** What the server last confirmed. Edits are compared against it, and a
   * rejected save returns to it. */
  readonly saved: TValue;
  /** Names the field the value belongs to, since a mutation that can write
   * several takes an object rather than the value on its own. */
  readonly toInput: (value: TValue) => TInput;
}

interface DebouncedSave<TValue> {
  /** Commits whatever is pending now, for a blur or an Enter. */
  readonly flush: () => void;
  readonly onChange: (next: TValue) => void;
  /** Abandons the edit and returns to what the server holds. */
  readonly reset: () => void;
  /** The edit in progress, or the saved value when nothing is being edited. */
  readonly value: TValue;
}

/**
 * Edits a single field in place: holds the draft while it is being typed,
 * writes once typing settles, and returns to the saved value if the write is
 * refused — so a field can never keep a value the server rejected.
 */
export function useDebouncedSave<TValue, TInput>({
  saved,
  mutation,
  onError,
  toInput,
}: DebouncedSaveOptions<TValue, TInput>): DebouncedSave<TValue> {
  const [draft, setDraft] = useState<TValue | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Read at commit time rather than captured when the keystroke landed: the
   * server value can change during the wait, and comparing against a stale one
   * either skips a write that was needed or repeats one that was not. */
  const latest = useRef(saved);
  useEffect(() => {
    latest.current = saved;
  }, [saved]);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  /** A pending write outlives the field it was typed into, so the timer is
   * cleared on the way out rather than firing into a component that is gone. */
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    []
  );

  const commit = (next: TValue) => {
    clear();
    if (next === latest.current) {
      setDraft(null);
      return;
    }
    mutation.mutate(toInput(next), {
      onError: (error) => {
        setDraft(null);
        onError(error);
      },
      onSuccess: () => setDraft(null),
    });
  };

  return {
    value: draft ?? saved,
    onChange: (next) => {
      setDraft(next);
      clear();
      timer.current = setTimeout(() => commit(next), SAVE_DELAY_MS);
    },
    /** Only where a write is still owed: once the timer has fired the value is
     * already on its way, and committing again would send it twice. */
    flush: () => {
      if (timer.current !== null && draft !== null) {
        commit(draft);
      }
    },
    reset: () => {
      clear();
      setDraft(null);
    },
  };
}
