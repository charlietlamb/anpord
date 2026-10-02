import { CurrentActor } from "@sphynx/schema/internal/authentication";
import { Effect } from "effect";

export const organization = Effect.map(
  CurrentActor,
  (actor) => actor.organizationId
);
