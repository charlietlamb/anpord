import { Context, type Effect, type Option } from "effect";
import type { HarnessName } from "../domain/cell";
import type { ModelsUnreadable } from "../domain/errors";
import type { ModelPrice } from "../domain/model-price";

export interface AvailableModelsShape {
  readonly forHarness: (
    harness: typeof HarnessName.Type
  ) => Effect.Effect<readonly string[], ModelsUnreadable>;
}

export class AvailableModels extends Context.Tag(
  "@anpord/eval/AvailableModels"
)<AvailableModels, AvailableModelsShape>() {}

export interface ModelDescription {
  readonly displayName: string;
  /* Ordered by, not shown. */
  readonly releasedAt: string | null;
  readonly summary: string | null;
  readonly vendor: string | null;
}

export interface ModelDescriptionsShape {
  /* Keyed by harness: one taking `provider/model` spans every vendor at once. */
  readonly forHarness: (
    harness: typeof HarnessName.Type
  ) => Effect.Effect<ReadonlyMap<string, ModelDescription>, ModelsUnreadable>;
}

export class ModelDescriptions extends Context.Tag(
  "@anpord/eval/ModelDescriptions"
)<ModelDescriptions, ModelDescriptionsShape>() {}

export interface ModelPricesShape {
  readonly forModel: (
    model: string
  ) => Effect.Effect<Option.Option<ModelPrice>, ModelsUnreadable>;
}

export class ModelPrices extends Context.Tag("@anpord/eval/ModelPrices")<
  ModelPrices,
  ModelPricesShape
>() {}
