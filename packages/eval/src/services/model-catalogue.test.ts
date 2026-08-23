import { describe, expect, it } from "bun:test";
import { Effect, Layer, Logger } from "effect";
import { ModelsUnreadable } from "../domain/errors";
import {
  AvailableModels,
  type ModelDescription,
  ModelDescriptions,
} from "../ports/model-source";
import { layerWithoutDependencies, ModelCatalogues } from "./model-catalogue";

const failing = (source: string) =>
  Effect.fail(new ModelsUnreadable({ cause: new Error("nope"), source }));

const sources = (
  available: Effect.Effect<readonly string[], ModelsUnreadable>,
  described: Effect.Effect<
    ReadonlyMap<string, ModelDescription>,
    ModelsUnreadable
  >
) =>
  layerWithoutDependencies.pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(AvailableModels, { forHarness: () => available }),
        Layer.succeed(ModelDescriptions, { forHarness: () => described })
      )
    )
  );

const catalogueFrom = (layer: Layer.Layer<ModelCatalogues>) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const catalogues = yield* ModelCatalogues;

      return yield* catalogues.forHarness({ harness: "codex" });
    }).pipe(
      Effect.provide(layer),
      Effect.provide(Logger.remove(Logger.defaultLogger))
    )
  );

describe("ModelCatalogues", () => {
  it("describes the ids the harness offers", async () => {
    const catalogue = await catalogueFrom(
      sources(
        Effect.succeed(["gpt-5.6-sol"]),
        Effect.succeed(
          new Map([
            [
              "gpt-5.6-sol",
              {
                displayName: "GPT-5.6 Sol",
                releasedAt: null,
                summary: "Frontier model",
                vendor: "openai",
              },
            ],
          ])
        )
      )
    );

    expect(catalogue.models).toEqual([
      {
        displayName: "GPT-5.6 Sol",
        id: "gpt-5.6-sol",
        summary: "Frontier model",
        vendor: "openai",
      },
    ]);
  });

  it("offers a model the vendor has not heard of", async () => {
    const catalogue = await catalogueFrom(
      sources(Effect.succeed(["gpt-9-unreleased"]), Effect.succeed(new Map()))
    );

    expect(catalogue.models).toEqual([
      {
        displayName: "gpt-9-unreleased",
        id: "gpt-9-unreleased",
        summary: null,
        vendor: null,
      },
    ]);
  });

  it("falls back to bare ids when the vendor is unreachable", async () => {
    const catalogue = await catalogueFrom(
      sources(Effect.succeed(["gpt-5.5"]), failing("models.dev"))
    );

    expect(catalogue.models).toEqual([
      {
        displayName: "gpt-5.5",
        id: "gpt-5.5",
        summary: null,
        vendor: null,
      },
    ]);
  });

  it("offers nothing when the harness cannot be read", async () => {
    const catalogue = await catalogueFrom(
      sources(
        failing("config.toml"),
        Effect.succeed(
          new Map([
            [
              "gpt-5.5",
              {
                displayName: "GPT-5.5",
                releasedAt: null,
                summary: null,
                vendor: "openai",
              },
            ],
          ])
        )
      )
    );

    expect(catalogue.models).toEqual([]);
  });

  it("asks each source once", async () => {
    let asked = 0;
    const layer = layerWithoutDependencies.pipe(
      Layer.provide(
        Layer.mergeAll(
          Layer.succeed(AvailableModels, {
            forHarness: () =>
              Effect.sync(() => {
                asked += 1;
                return ["gpt-5.5"];
              }),
          }),
          Layer.succeed(ModelDescriptions, {
            forHarness: () => Effect.succeed(new Map()),
          })
        )
      )
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const catalogues = yield* ModelCatalogues;

        yield* catalogues.forHarness({ harness: "codex" });
        yield* catalogues.forHarness({ harness: "codex" });
        yield* catalogues.forHarness({ harness: "codex" });
      }).pipe(Effect.provide(layer))
    );

    expect(asked).toBe(1);
  });
});
