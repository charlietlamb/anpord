import type { UseMutationResult } from "@tanstack/react-query";
import { useRef, useState } from "react";

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

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const commit = (next: TValue) => {
    clear();
    if (next === saved) {
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
    flush: () => {
      if (draft !== null) {
        commit(draft);
      }
    },
    reset: () => {
      clear();
      setDraft(null);
    },
  };
}
