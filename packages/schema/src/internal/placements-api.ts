import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { Conflict, Forbidden, NotFound } from "../domain/errors";
import {
  ApplyPlacementsRequest,
  ApplyPlacementsResponse,
  PlacementPage,
} from "../domain/placements";
import { LimitFromString } from "../domain/prompts";
import { Authentication } from "./authentication";

const PlacementQuery = Schema.Struct({
  cursor: Schema.optional(
    Schema.String.annotations({
      description:
        "The nextCursor of the page already read. Opaque, and only ever " +
        "returned by this endpoint.",
    })
  ),
  limit: Schema.optional(LimitFromString),
  q: Schema.optional(Schema.String),
});

export class PlacementsGroup extends HttpApiGroup.make("placements")
  .add(
    HttpApiEndpoint.get("list", "/placements")
      .setUrlParams(PlacementQuery)
      .addSuccess(PlacementPage)
  )
  .add(
    HttpApiEndpoint.post("apply", "/placements")
      .setPayload(ApplyPlacementsRequest)
      .addSuccess(ApplyPlacementsResponse)
  )
  .addError(Conflict)
  .addError(Forbidden)
  .addError(NotFound)
  .middleware(Authentication) {}
