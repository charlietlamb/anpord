import { CurrentActor } from "@anpord/schema/internal/authentication";
import { Effect } from "effect";

export const organization = Effect.map(
  CurrentActor,
  (actor) => actor.organizationId
);
