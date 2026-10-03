import { useState } from "react";
import type { EnvEntry } from "@/lib/settings/env-lines";
import {
  type DraftRow,
  draftRow,
  pasteInto,
  withTrailingRow,
} from "@/lib/settings/variable-draft";

interface Pasted {
  readonly before: readonly DraftRow[];
  readonly count: number;
}

export function useVariableDraft() {
  const [rows, setRows] = useState<readonly DraftRow[]>(() => [draftRow()]);
  const [pasted, setPasted] = useState<Pasted | null>(null);

  const update = (id: string, patch: Partial<Omit<DraftRow, "id">>) =>
    setRows((current) =>
      withTrailingRow(
        current.map((row) => (row.id === id ? { ...row, ...patch } : row))
      )
    );

  const remove = (id: string) =>
    setRows((current) =>
      withTrailingRow(current.filter((row) => row.id !== id))
    );

  const paste = (id: string, entries: readonly EnvEntry[]) => {
    setPasted({ before: rows, count: entries.length });
    setRows(
      pasteInto(
        rows,
        rows.findIndex((row) => row.id === id),
        entries
      )
    );
  };

  const undo = () => {
    if (pasted !== null) {
      setRows(pasted.before);
      setPasted(null);
    }
  };

  return { pasted, paste, remove, rows, undo, update };
}
