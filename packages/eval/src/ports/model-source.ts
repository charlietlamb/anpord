import { Context, type Effect } from "effect";
import type { HarnessName } from "../domain/cell";
import type { ModelsUnreadable } from "../domain/errors";

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
