import { Effect, Layer } from "effect";
import {
  type ModelDescription,
  ModelDescriptions,
} from "../../ports/model-source";
import { codexDescriptions } from "./codex-available";
import { perHarness } from "./resolve";
import { staticDescriptions } from "./static";

export const ModelDescriptionsLive = Layer.effect(
  ModelDescriptions,
  Effect.map(
    perHarness<ReadonlyMap<string, ModelDescription>>({
      codex: codexDescriptions,
      isEmpty: (described) => described.size === 0,
      known: staticDescriptions,
      opencode: ({ described }) => described,
    }),
    (forHarness) =>
      ModelDescriptions.of({
        forHarness: (harness) =>
          forHarness(harness).pipe(
            Effect.withSpan("ModelDescriptions.forHarness", {
              attributes: { harness },
            })
          ),
      })
  )
);
