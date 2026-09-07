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

/* The runtime is taken once and handed to whichever branch runs: building both
   eagerly made asking for one demand the other's dependencies. */
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

        /* Same fallback as the model list: an absent cache means the server
           never ran that CLI, not that the harness has no models. */
        return Effect.flatMap(
          selected === "codex" ? codex : opencode,
          (source) =>
            Effect.map(source.forHarness(harness), (described) =>
              described.size === 0 ? staticDescriptions(harness) : described
            )
        );
      },
    });
  })
);
