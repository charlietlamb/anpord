import { Config } from "effect";

/** Pinned, because the cell key carries it: an unpinned install silently
 * compares two different harnesses a month apart. Configured rather than
 * literal, so upgrading it is a deployment decision and not a code change. */
export const harnessVersion = Config.string("EVAL_HARNESS_VERSION").pipe(
  Config.withDefault("0.144.4")
);
