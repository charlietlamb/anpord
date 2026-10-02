export type EveOutcome =
  | { readonly status: "completed" }
  | { readonly reason: string; readonly status: "failed" | "parked" };

export const finishedReason = (outcome: EveOutcome): string =>
  outcome.status === "completed"
    ? "completed"
    : `${outcome.status}: ${outcome.reason}`;

export const exitCodes: Readonly<Record<EveOutcome["status"], number>> = {
  completed: 0,
  failed: 1,
  parked: 3,
};
