import { describe, expect, it } from "bun:test";
import { FetchHttpClient, FileSystem, Path } from "@effect/platform";
import { Effect, Layer } from "effect";
import { AvailableModels } from "../../ports/model-source";
import { AvailableModelsLive } from "./resolve";
import { staticModels } from "./static";

/* A filesystem holding nothing is a server that never ran the Codex CLI, which
   is where the cache the adapter reads would have been written. */
const Platform = Layer.mergeAll(
  FileSystem.layerNoop({}),
  Path.layer,
  FetchHttpClient.layer
);

const listed = (harness: "claude" | "codex") =>
  Effect.runPromise(
    AvailableModels.pipe(
      Effect.flatMap((source) => source.forHarness(harness)),
      Effect.provide(Layer.provide(AvailableModelsLive, Platform))
    )
  );

describe("the models a harness offers", () => {
  it("falls back to the known list when codex has no cache", async () => {
    expect(await listed("codex")).toEqual(staticModels.codex ?? []);
  });

  it("still serves a harness that was always static", async () => {
    expect(await listed("claude")).toEqual(staticModels.claude ?? []);
  });
});
