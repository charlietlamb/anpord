import type { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";

type VersionRow = Pick<
  typeof evalCaseVersion.$inferSelect,
  "cache" | "prepare" | "prompt" | "source" | "user" | "validator" | "verify"
>;

const PARTS: readonly (readonly [string, (row: VersionRow) => unknown])[] = [
  ["prompt", (row) => row.prompt],
  ["source", (row) => row.source],
  ["setup", (row) => row.prepare?.source ?? null],
  ["validator", (row) => row.validator],
  ["verifier", (row) => row.verify],
  ["simulated user", (row) => row.user],
  ["cache", (row) => row.cache],
];

export const changesBetween = (
  before: VersionRow,
  after: VersionRow
): readonly string[] =>
  PARTS.filter(
    ([, read]) => JSON.stringify(read(before)) !== JSON.stringify(read(after))
  ).map(([part]) => part);
