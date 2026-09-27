import { Effect, Option } from "effect";
import type { Database } from "./client";

export type Db = Database["Type"];

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export const head = <A>(rows: readonly A[]) => Option.fromNullable(rows.at(0));

export const tryStoreWith =
  <E>(
    StoreError: new (failure: {
      readonly cause: unknown;
      readonly operation: string;
    }) => E
  ) =>
  <A>(operation: string, run: () => Promise<A>) =>
    Effect.tryPromise({
      catch: (cause) => new StoreError({ cause, operation }),
      try: run,
    });
