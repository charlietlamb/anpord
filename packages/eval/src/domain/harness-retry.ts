import { Effect, Schedule } from "effect";
import { HarnessUnavailable } from "./errors";

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

const WAIT = Schedule.exponential("5 seconds").pipe(
  Schedule.compose(Schedule.recurs(4)),
  Schedule.whileInput(isTransientHarnessFailure)
);

/* A provider that stays busy past the schedule voids the run, and its own
   message only says to try a different model, so the failure names the one
   that was asked for and where the free ones are listed. */
export const gaveUpOn = (model: string, failure: HarnessUnavailable) =>
  isTransientHarnessFailure(failure)
    ? new HarnessUnavailable({
        harness: failure.harness,
        reason: `${failure.harness} had no capacity for ${model} after several attempts. List the models it can reach with evals.models, then set one that is free on the task.`,
      })
    : failure;

export const waitingOutCapacity =
  (model: string) =>
  <A, R>(session: Effect.Effect<A, HarnessUnavailable, R>) =>
    session.pipe(
      Effect.retry(WAIT),
      Effect.mapError((failure) => gaveUpOn(model, failure))
    );
