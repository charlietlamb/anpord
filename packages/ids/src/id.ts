import { Context, type Effect } from "effect";
import type { IdEntity } from "./prefixes";

export interface IdGeneratorShape {
  readonly generate: (entity: IdEntity) => Effect.Effect<string>;
}

export class IdGenerator extends Context.Tag("@anpord/ids/IdGenerator")<
  IdGenerator,
  IdGeneratorShape
>() {}
