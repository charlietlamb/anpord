import type { Database } from "@anpord/db/client";
import { Effect, Option } from "effect";
import { PromptStoreError } from "../domain/errors";

export type Tx = Parameters<Parameters<Database["Type"]["transaction"]>[0]>[0];

export const tryStore = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new PromptStoreError({ cause, operation }),
  });

export const head = <A>(rows: readonly A[]) => Option.fromNullable(rows.at(0));
