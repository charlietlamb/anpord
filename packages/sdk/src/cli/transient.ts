import { HttpClientError } from "@effect/platform";
import { neverAnswered } from "@sphynx/schema/public/deadlines";
import { Duration, Effect, Schedule, ScheduleDecision } from "effect";
import { note } from "./render";

const TRANSIENT_STATUSES = new Set([429, 502, 503, 504]);

const isTransient = (error: unknown) => {
  if (!HttpClientError.isHttpClientError(error) || neverAnswered(error)) {
    return false;
  }
  return error._tag === "RequestError"
    ? error.reason === "Transport"
    : TRANSIENT_STATUSES.has(error.response.status);
};

const whileTransient = Schedule.exponential(Duration.millis(500)).pipe(
  Schedule.jittered,
  Schedule.either(Schedule.spaced(Duration.seconds(20))),
  Schedule.upTo(Duration.minutes(2)),
  Schedule.whileInput(isTransient),
  Schedule.onDecision((_, decision) =>
    ScheduleDecision.isContinue(decision)
      ? note("Sphynx is not answering. Trying again.")
      : Effect.void
  )
);

export const retryTransient = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.retry(effect, whileTransient);
