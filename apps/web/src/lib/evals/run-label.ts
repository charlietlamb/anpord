import type { EvalRun } from "@anpord/schema/domain/evals";
import { shortId } from "./short-id";

export const runLabel = (
  run: Pick<EvalRun, "cases" | "id" | "name">
): string => {
  if (run.name !== null) {
    return run.name;
  }

  const name = run.cases[0] ?? shortId(run.id);

  return run.cases.length > 1
    ? `${name} +${run.cases.length - 1}`
    : `${name} ${shortId(run.id)}`;
};
