import { Effect, Option } from "effect";
import { EvalStoreError } from "../domain/errors";

export const tryStore = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    catch: (cause) => new EvalStoreError({ cause, operation }),
    try: run,
  });

export const head = <A>(rows: readonly A[]) => Option.fromNullable(rows.at(0));
