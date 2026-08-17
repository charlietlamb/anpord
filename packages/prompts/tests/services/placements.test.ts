import { describe, expect, test } from "bun:test";
import { VersionNumber } from "@anpord/schema/domain/prompts";
import { Effect, Layer } from "effect";
import { VersionNotFound } from "../../src/domain/errors";
import {
  PlacementRepository,
  type PlacementRepositoryShape,
  type PlacementRow,
} from "../../src/repositories/placement-repository";
import { Placements, PlacementsLive } from "../../src/services/placements";
import {
  PromptPublishing,
  type PromptPublishingShape,
} from "../../src/services/prompt-publishing";
import { actor } from "../fixtures/prompt-rows";

const at = new Date("2026-01-01T00:00:00.000Z");

const promptRow = (
  id: string,
  latestVersion: number | null,
  internalId = `pmt_${id}`
) => ({ id, internalId, latestVersion, name: id, updatedAt: at });

const placementRow = (
  promptInternalId: string,
  channel: string,
  version: number
): PlacementRow => ({
  channel,
  promptInternalId,
  updatedAt: at,
  updatedBy: { image: null, name: "Charlie Lamb" },
  version,
});

/** The query reads one row past the page, so the stub does too. Slicing to the
 * limit here would hide the only signal the service has that another page
 * exists. */
const repository = (
  prompts: readonly ReturnType<typeof promptRow>[],
  placements: readonly PlacementRow[] = []
) =>
  Layer.succeed(PlacementRepository, {
    list: (_org, params) => Effect.succeed(prompts.slice(0, params.limit + 1)),
    placementsFor: () => Effect.succeed(placements),
    totals: () => Effect.succeed({ behind: 0, prompts: prompts.length }),
  } satisfies PlacementRepositoryShape);

/** Records what reached the write path, so the batch's ordering and its
 * refusal to stop at the first failure can both be checked. */
const publishing = (reject: (version: number) => boolean = () => false) => {
  const applied: string[] = [];

  const layer = Layer.succeed(PromptPublishing, {
    listChannels: () => Effect.succeed([]),
    publishVersion: () => Effect.void,
    setChannel: (_actor, id, request) => {
      if (reject(request.version)) {
        return Effect.fail(
          new VersionNotFound({ promptId: id, version: request.version })
        );
      }
      applied.push(`${id}:${request.channel}:${request.version}`);
      return Effect.void;
    },
  } satisfies PromptPublishingShape);

  return { applied, layer };
};

const run = <A, E>(
  effect: Effect.Effect<A, E, Placements>,
  layers: Layer.Layer<PlacementRepository | PromptPublishing>
) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(PlacementsLive.pipe(Layer.provide(layers))))
  );

describe("Placements.list", () => {
  test("groups every channel under the prompt it points at", async () => {
    const layers = Layer.mergeAll(
      repository(
        [promptRow("greeting", 5)],
        [
          placementRow("pmt_greeting", "production", 3),
          placementRow("pmt_greeting", "staging", 5),
        ]
      ),
      publishing().layer
    );

    const page = await run(
      Effect.gen(function* () {
        const svc = yield* Placements;
        return yield* svc.list(actor, { limit: 25 });
      }),
      layers
    );

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.placements).toHaveLength(2);
    expect(page.items[0]?.latestVersion).toBe(VersionNumber.make(5));
  });

  /** A prompt nobody has pointed anywhere still belongs on the grid: it is
   * the row most likely to need a channel. */
  test("keeps a prompt that has never been pointed anywhere", async () => {
    const layers = Layer.mergeAll(
      repository([promptRow("greeting", 2)], []),
      publishing().layer
    );

    const page = await run(
      Effect.gen(function* () {
        const svc = yield* Placements;
        return yield* svc.list(actor, { limit: 25 });
      }),
      layers
    );

    expect(page.items[0]?.placements).toHaveLength(0);
  });

  test("offers a cursor only when a further row exists", async () => {
    const three = [
      promptRow("alpha", 1),
      promptRow("beta", 1),
      promptRow("gamma", 1),
    ];

    const full = await run(
      Effect.gen(function* () {
        const svc = yield* Placements;
        return yield* svc.list(actor, { limit: 2 });
      }),
      Layer.mergeAll(repository(three), publishing().layer)
    );
    expect(full.items).toHaveLength(2);
    expect(full.nextCursor).not.toBeNull();

    const last = await run(
      Effect.gen(function* () {
        const svc = yield* Placements;
        return yield* svc.list(actor, { limit: 3 });
      }),
      Layer.mergeAll(repository(three), publishing().layer)
    );
    expect(last.nextCursor).toBeNull();
  });

  test("refuses a cursor it did not issue", async () => {
    const result = await run(
      Effect.either(
        Effect.gen(function* () {
          const svc = yield* Placements;
          return yield* svc.list(actor, { cursor: "not-a-cursor", limit: 25 });
        })
      ),
      Layer.mergeAll(repository([]), publishing().layer)
    );

    expect(result._tag).toBe("Left");
  });
});

describe("Placements.apply", () => {
  test("applies every change and reports each one", async () => {
    const writes = publishing();
    const layers = Layer.mergeAll(repository([]), writes.layer);

    const response = await run(
      Effect.gen(function* () {
        const svc = yield* Placements;
        return yield* svc.apply(actor, {
          changes: [
            { channel: "production", promptId: "greeting", version: 3 },
            { channel: "staging", promptId: "greeting", version: 2 },
          ],
        } as never);
      }),
      layers
    );

    expect(response.results.every((row) => row.error === null)).toBe(true);
    expect(writes.applied).toEqual([
      "greeting:production:3",
      "greeting:staging:2",
    ]);
  });

  /** A caller who moved eight channels and got one rejection needs to know
   * which one, and re-sending the other seven would move them twice. */
  test("keeps applying after one change is rejected", async () => {
    const writes = publishing((version) => version === 99);
    const layers = Layer.mergeAll(repository([]), writes.layer);

    const response = await run(
      Effect.gen(function* () {
        const svc = yield* Placements;
        return yield* svc.apply(actor, {
          changes: [
            { channel: "production", promptId: "greeting", version: 99 },
            { channel: "staging", promptId: "greeting", version: 2 },
          ],
        } as never);
      }),
      layers
    );

    expect(response.results[0]?.error).toBe("Version 99 does not exist");
    expect(response.results[1]?.error).toBeNull();
    expect(writes.applied).toEqual(["greeting:staging:2"]);
  });

  test("reports the rule that rejected a change rather than a stack", async () => {
    const writes = publishing(() => true);
    const layers = Layer.mergeAll(repository([]), writes.layer);

    const response = await run(
      Effect.gen(function* () {
        const svc = yield* Placements;
        return yield* svc.apply(actor, {
          changes: [
            { channel: "production", promptId: "greeting", version: 4 },
          ],
        } as never);
      }),
      layers
    );

    expect(response.results[0]?.error).toBe("Version 4 does not exist");
  });

  /** Applied one at a time rather than concurrently: two changes to the same
   * channel would otherwise race, and the last writer would win without
   * either caller being told. */
  test("applies changes in the order they were sent", async () => {
    const writes = publishing();
    const layers = Layer.mergeAll(repository([]), writes.layer);

    await run(
      Effect.gen(function* () {
        const svc = yield* Placements;
        return yield* svc.apply(actor, {
          changes: [
            { channel: "production", promptId: "greeting", version: 1 },
            { channel: "production", promptId: "greeting", version: 2 },
            { channel: "production", promptId: "greeting", version: 3 },
          ],
        } as never);
      }),
      layers
    );

    expect(writes.applied).toEqual([
      "greeting:production:1",
      "greeting:production:2",
      "greeting:production:3",
    ]);
  });
});
