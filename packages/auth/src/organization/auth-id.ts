import { Effect } from "effect";

/* Better Auth mints ids as 32 characters of a-zA-Z0-9; matched here because its
   generator lives in `@better-auth/core`, not a supported entry point. */
const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const LENGTH = 32;

/** For tables Better Auth also writes, so its plugins define the id shape. */
export const authId = Effect.sync(() =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(LENGTH)),
    (byte) => ALPHABET[byte % ALPHABET.length]
  ).join("")
);
