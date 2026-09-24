import { Schema } from "effect";
import { EvalHarness } from "./evals";

export const CatalogueModel = Schema.Struct({
  displayName: Schema.String,
  id: Schema.String,
  summary: Schema.NullOr(Schema.String),
  vendor: Schema.NullOr(Schema.String),
}).annotations({
  description: "A model available to the installed harness.",
  identifier: "CatalogueModel",
});
export type CatalogueModel = typeof CatalogueModel.Type;

export const ModelCatalogue = Schema.Struct({
  harness: EvalHarness,
  models: Schema.Array(CatalogueModel),
  total: Schema.Int,
}).annotations({
  description: "Models available to the installed harness.",
  identifier: "ModelCatalogue",
});
export type ModelCatalogue = typeof ModelCatalogue.Type;
