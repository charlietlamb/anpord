import {
  RESERVED_VARIABLE_PREFIX,
  VariableName,
} from "@sphynx/schema/domain/environment";
import { Schema } from "effect";
import type { EnvEntry } from "@/lib/settings/env-lines";

export interface DraftRow {
  readonly id: string;
  readonly name: string;
  readonly value: string;
}

export interface RowProblem {
  readonly field: "name" | "value";
  readonly message: string;
  readonly tone: "error" | "warning";
}

export interface ExistingVariable {
  readonly name: string;
  readonly preview: string;
  readonly scope: string;
}

const isVariableName = Schema.is(VariableName);

export const draftRow = (entry: Partial<EnvEntry> = {}): DraftRow => ({
  id: crypto.randomUUID(),
  name: entry.name ?? "",
  value: entry.value ?? "",
});

const isBlank = (row: DraftRow) => row.name === "" && row.value === "";

export const withTrailingRow = (rows: readonly DraftRow[]) => {
  const last = rows.at(-1);

  return last !== undefined && isBlank(last) ? rows : [...rows, draftRow()];
};

export const pasteInto = (
  rows: readonly DraftRow[],
  index: number,
  entries: readonly EnvEntry[]
) =>
  withTrailingRow([
    ...rows.slice(0, index),
    ...entries.map(draftRow),
    ...rows.slice(index + 1),
  ]);

const nameProblem = (name: string): string | null => {
  if (name.startsWith(RESERVED_VARIABLE_PREFIX)) {
    return `Names starting with ${RESERVED_VARIABLE_PREFIX} are reserved. Rename it or remove the row.`;
  }

  return isVariableName(name)
    ? null
    : "Use capital letters, digits and underscores";
};

export const rowProblem = (
  rows: readonly DraftRow[],
  index: number,
  existing: readonly ExistingVariable[],
  scope: string
): RowProblem | null => {
  const name = rows[index]?.name.trim() ?? "";

  if (name === "") {
    return null;
  }

  const invalid = nameProblem(name);

  if (invalid !== null) {
    return { field: "name", message: invalid, tone: "error" };
  }

  if (rows.slice(0, index).some((row) => row.name.trim() === name)) {
    return {
      field: "name",
      message: "This name is already in the list",
      tone: "error",
    };
  }

  const replaced = existing.find(
    (variable) => variable.name === name && variable.scope === scope
  );

  return replaced === undefined
    ? null
    : {
        field: "value",
        message: `Replaces ${replaced.preview} on save`,
        tone: "warning",
      };
};

export const completeRows = (rows: readonly DraftRow[]) =>
  rows
    .map((row) => ({ name: row.name.trim(), value: row.value }))
    .filter((row) => row.name !== "" && row.value !== "");
