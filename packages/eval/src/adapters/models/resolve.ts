import { FileSystem, HttpClient, Path } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import type { HarnessName } from "../../domain/cell";
import { AvailableModels } from "../../ports/model-source";
import { layer as CodexAvailableLive } from "./codex-available";
import { layer as OpencodeAvailableLive } from "./opencode-available";
import { staticModels } from "./static";

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
 * Routes a catalogue request to the harness that can answer it.
 *
 * Each source answers only for the harness it knows: OpenCode takes
 * `provider/model` and Codex takes a bare id, so offering either list for the
 * other names models the run cannot address.
 *
 * The runtime each wants is taken once here and handed back to whichever
 * branch runs. Building both adapters up front instead made asking for one
 * demand the other's dependencies, and a server holding an http client but no
 * filesystem lost the whole catalogue rather than the half it could not serve.
 */
export const AvailableModelsLive = Layer.effect(
  AvailableModels,
  Effect.gen(function* () {
    const runtime = Context.empty().pipe(
      Context.add(FileSystem.FileSystem, yield* FileSystem.FileSystem),
      Context.add(HttpClient.HttpClient, yield* HttpClient.HttpClient),
      Context.add(Path.Path, yield* Path.Path)
    );

    const codex = yield* Effect.cached(
      AvailableModels.pipe(
        Effect.provide(CodexAvailableLive),
        Effect.provide(runtime)
      )
    );

    const opencode = yield* Effect.cached(
      AvailableModels.pipe(
        Effect.provide(OpencodeAvailableLive),
        Effect.provide(runtime)
      )
    );

    return AvailableModels.of({
      forHarness: (harness) => {
        const selected = sourceOf[harness];

        if (selected === "static") {
          return Effect.succeed(staticModels[harness] ?? []);
        }

        return Effect.flatMap(
          selected === "codex" ? codex : opencode,
          (source) => source.forHarness(harness)
        );
      },
    });
  })
);
