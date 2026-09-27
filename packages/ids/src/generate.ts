import { Effect } from "effect";
import { IdGenerator } from "./id";
import { IdGeneratorLive } from "./layer";
import type { IdEntity } from "./prefixes";

export const generateId = (entity: IdEntity) =>
  Effect.runPromise(
    IdGenerator.pipe(
      Effect.flatMap((ids) => ids.generate(entity)),
      Effect.provide(IdGeneratorLive)
    )
  );
