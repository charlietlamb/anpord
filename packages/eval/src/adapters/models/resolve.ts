import { FileSystem, HttpClient, Path } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import type { HarnessName } from "../../domain/cell";
import type { ModelsUnreadable } from "../../domain/errors";
import { AvailableModels } from "../../ports/model-source";
import { codexModels } from "./codex-available";
import { type ModelsDevCatalogue, modelsDev } from "./models-dev";
import { staticModels } from "./static";

type Source = "codex" | "opencode" | "static";

const sourceOf: Record<HarnessName, Source> = {
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

type CodexModels = Effect.Effect.Success<typeof codexModels>;

interface HarnessCatalogue<A> {
  readonly codex: (models: CodexModels) => A;
  readonly isEmpty: (value: A) => boolean;
  readonly known: (harness: HarnessName) => A;
  readonly opencode: (catalogue: ModelsDevCatalogue) => A;
}

export const perHarness = <A>(catalogue: HarnessCatalogue<A>) =>
  Effect.gen(function* () {
    const runtime = Context.empty().pipe(
      Context.add(FileSystem.FileSystem, yield* FileSystem.FileSystem),
      Context.add(HttpClient.HttpClient, yield* HttpClient.HttpClient),
      Context.add(Path.Path, yield* Path.Path)
    );
    const opencode = yield* modelsDev;

    return (harness: HarnessName): Effect.Effect<A, ModelsUnreadable> => {
      const source = sourceOf[harness];

      if (source === "static") {
        return Effect.succeed(catalogue.known(harness));
      }

      const read: Effect.Effect<
        A,
        ModelsUnreadable,
        FileSystem.FileSystem | HttpClient.HttpClient | Path.Path
      > =
        source === "codex"
          ? Effect.map(codexModels, catalogue.codex)
          : Effect.map(opencode, catalogue.opencode);

      return read.pipe(
        Effect.provide(runtime),
        Effect.map((found) =>
          catalogue.isEmpty(found) ? catalogue.known(harness) : found
        )
      );
    };
  });

export const AvailableModelsLive = Layer.effect(
  AvailableModels,
  Effect.map(
    perHarness<readonly string[]>({
      codex: (models) => models.map((model) => model.slug),
      isEmpty: (models) => models.length === 0,
      known: (harness) => staticModels[harness] ?? [],
      opencode: ({ ids }) => ids,
    }),
    (forHarness) =>
      AvailableModels.of({
        forHarness: (harness) =>
          forHarness(harness).pipe(
            Effect.withSpan("AvailableModels.forHarness", {
              attributes: { harness },
            })
          ),
      })
  )
);
