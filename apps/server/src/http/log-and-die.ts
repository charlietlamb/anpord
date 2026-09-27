import { Effect } from "effect";

/* Logged before dying: the platform discards the cause, leaving an empty 500. */
export const logAndDie = (message: string) => (error: unknown) =>
  Effect.logError(message, error).pipe(Effect.zipRight(Effect.die(error)));
