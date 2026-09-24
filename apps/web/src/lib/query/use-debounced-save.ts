import type { UseMutationResult } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

const SAVE_DELAY_MS = 600;

interface DebouncedSaveOptions<TValue, TInput> {
  readonly mutation: UseMutationResult<unknown, Error, TInput>;
  readonly onError: (error: Error) => void;
  readonly saved: TValue;
  readonly toInput: (value: TValue) => TInput;
}

interface DebouncedSave<TValue> {
  readonly flush: () => void;
  readonly onChange: (next: TValue) => void;
  readonly reset: () => void;
  readonly value: TValue;
}

export function useDebouncedSave<TValue, TInput>({
  saved,
  mutation,
  onError,
  toInput,
}: DebouncedSaveOptions<TValue, TInput>): DebouncedSave<TValue> {
  const [draft, setDraft] = useState<TValue | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
