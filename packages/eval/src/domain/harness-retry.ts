import { Schedule } from "effect";
import type { HarnessUnavailable } from "./errors";

/* A provider at capacity clears on its own, often within seconds, but a cell
   that meets one voids its whole run. Retrying a rejected model or a spent
   credential only spends another sandbox on the same answer. */
const TRANSIENT = [
  "at capacity",
  "temporarily unavailable",
  "overloaded",
  "rate limit",
  "try again",
];

export const isTransientHarnessFailure = ({ reason }: HarnessUnavailable) =>
  TRANSIENT.some((phrase) => reason.toLowerCase().includes(phrase));

/* The sandbox is already open by the time the harness answers, so waiting is
   cheap next to losing the trial and everything spent reaching it. */
export const HARNESS_RETRY = Schedule.exponential("5 seconds").pipe(
  Schedule.compose(Schedule.recurs(4)),
  Schedule.whileInput(isTransientHarnessFailure)
);
