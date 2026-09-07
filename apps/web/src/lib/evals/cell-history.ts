import type { EvalCellHistoryEntry } from "@anpord/schema/domain/evals";

export const historyResult = (entry: EvalCellHistoryEntry) => {
  if (entry.finishedAt === null) {
    return { label: "Running", className: "text-muted-foreground" };
  }
  const { passed, scored, voided } = entry.distribution;
  if (scored === 0) {
    return { label: "Not scored", className: "text-muted-foreground" };
  }
  const passingClass = voided > 0 ? "text-muted-foreground" : "text-success";
  return {
    label: `${passed}/${scored} passed${voided > 0 ? ` · ${voided} not scored` : ""}`,
    className: passed < scored ? "text-destructive" : passingClass,
  };
};
