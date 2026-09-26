import { Effect } from "effect";
import type { SharedInstalls } from "../../ports/sandbox";
import { markUsed } from "./local-prune";
import { entryIn, publishOnce } from "./local-publish";

export const localInstalls = (
  store: string,
  staging: string
): SharedInstalls => ({
  ensure: (key, install) =>
    publishOnce(staging, entryIn(store, key), install).pipe(
      Effect.zipRight(markUsed(entryIn(store, key)))
    ),
  homeFor: (key) => entryIn(store, key),
});
