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
  /** Ordered by, not shown: within a vendor the newest model should be
   * offered first. Null where the catalogue does not say. */
  readonly releasedAt: string | null;
  readonly summary: string | null;
  /** The company behind the model, for the mark beside it. */
  readonly vendor: string | null;
}

export interface ModelDescriptionsShape {
  /** Keyed by harness rather than by vendor, because a harness that takes
   * `provider/model` spans every vendor at once and has none of its own to
   * name. */
  readonly forHarness: (
    harness: typeof HarnessName.Type
  ) => Effect.Effect<ReadonlyMap<string, ModelDescription>, ModelsUnreadable>;
}

export class ModelDescriptions extends Context.Tag(
  "@anpord/eval/ModelDescriptions"
)<ModelDescriptions, ModelDescriptionsShape>() {}

export interface ModelPricesShape {
  /**
   * What a model charges, or none where the catalogue does not price it.
   *
   * Separate from the descriptions because it answers a different question:
   * a picker asks what to offer, and a finished trial asks what it spent. A
   * model can be offered without a published price, and a price can be read
   * for a model no longer offered.
   */
  readonly forModel: (
    model: string
  ) => Effect.Effect<Option.Option<ModelPrice>, ModelsUnreadable>;
}

export class ModelPrices extends Context.Tag("@anpord/eval/ModelPrices")<
  ModelPrices,
  ModelPricesShape
>() {}
