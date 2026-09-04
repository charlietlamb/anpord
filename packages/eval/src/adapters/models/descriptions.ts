import { FileSystem, HttpClient, Path } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import type { HarnessName } from "../../domain/cell";
import { ModelDescriptions } from "../../ports/model-source";
import { descriptionsLayer as CodexDescriptions } from "./codex-available";
import { descriptionsLayer as OpencodeDescriptions } from "./opencode-descriptions";
import { staticDescriptions } from "./static";

const sourceOf: Record<HarnessName, "codex" | "opencode" | "static"> = {
  claude: "static",
  codex: "codex",
  command: "static",
  cursor: "static",
  fx: "opencode",
  gemini: "static",
  opencode: "opencode",
  pi: "opencode",
  qwen: "static",
};

/**
 * Routes a description request to the catalogue that can answer it, so a bare
 * Codex slug is never looked up among qualified OpenCode ids.
 *
 * The runtime is taken once and handed to whichever branch runs, for the same
 * reason as the ids beside it: built eagerly, asking one adapter demanded the
 * other's dependencies and a missing filesystem cost the whole catalogue.
 */
export const ModelDescriptionsLive = Layer.effect(
  ModelDescriptions,
  Effect.gen(function* () {
    const runtime = Context.empty().pipe(
      Context.add(FileSystem.FileSystem, yield* FileSystem.FileSystem),
      Context.add(HttpClient.HttpClient, yield* HttpClient.HttpClient),
      Context.add(Path.Path, yield* Path.Path)
    );

    const codex = yield* Effect.cached(
      ModelDescriptions.pipe(
        Effect.provide(CodexDescriptions),
        Effect.provide(runtime)
      )
    );

    const opencode = yield* Effect.cached(
      ModelDescriptions.pipe(
        Effect.provide(OpencodeDescriptions),
        Effect.provide(runtime)
      )
    );

    return ModelDescriptions.of({
      forHarness: (harness) => {
        const selected = sourceOf[harness];

        if (selected === "static") {
          return Effect.succeed(staticDescriptions(harness));
        }

        return Effect.flatMap(
          selected === "codex" ? codex : opencode,
          (source) => source.forHarness(harness)
        );
      },
    });
  })
);
