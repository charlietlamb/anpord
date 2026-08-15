import { Effect, Layer, Random } from "effect";
import { IdGenerator } from "./id";
import { ID_PREFIXES } from "./prefixes";

/** Crockford base32: no I, L, O or U, so ids survive being read aloud. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const SUFFIX_LENGTH = 24;

/**
 * Randomness comes from `Random` rather than `crypto`, so a seeded runtime
 * produces stable ids in tests without stubbing globals.
 */
export const IdGeneratorLive = Layer.succeed(
  IdGenerator,
  IdGenerator.of({
    generate: (entity) =>
      Effect.gen(function* () {
        const characters: string[] = [];

        for (let index = 0; index < SUFFIX_LENGTH; index++) {
          const position = yield* Random.nextIntBetween(0, ALPHABET.length);
          characters.push(ALPHABET[position]);
        }

        return `${ID_PREFIXES[entity]}_${characters.join("")}`;
      }),
  })
);
