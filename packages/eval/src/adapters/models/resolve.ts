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

/* The runtime is taken once and handed to whichever branch runs: building both
   adapters up front made asking for one demand the other's dependencies. */
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
