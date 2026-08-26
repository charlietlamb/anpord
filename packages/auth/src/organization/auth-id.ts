import { Effect } from "effect";

/* Better Auth mints ids as 32 characters of a-zA-Z0-9. Matched here rather
   than imported: the generator lives in `@better-auth/core`, which is a
   transitive dependency rather than a supported entry point, and installing
   it directly pulls a second copy that conflicts with the hoisted one. */
const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const LENGTH = 32;

/**
 * An id for a table Better Auth owns.
 *
 * Our own `IdGenerator` prefixes by entity, which is worth having for the
 * domain it owns -- a `run_` is recognisably a run. It is the wrong generator
 * for `organization` and `member`, because Better Auth's plugins also write
 * those rows and only one of the two writers can define the shape.
 */
export const authId = Effect.sync(() =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(LENGTH)),
    (byte) => ALPHABET[byte % ALPHABET.length]
  ).join("")
);
