import { Effect, Option } from "effect";
import { PromptStoreError } from "../domain/errors";

export const tryStore = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new PromptStoreError({ cause, operation }),
  });

export const head = <A>(rows: readonly A[]) => Option.fromNullable(rows.at(0));
