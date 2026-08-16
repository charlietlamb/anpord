import { describe, expect, test } from "bun:test";
import { ChannelName } from "@anpord/schema/domain/prompts";
import { Effect, Exit, Layer, Option } from "effect";
import {
  type ChannelRow,
  PromptChannelRepository,
  type PromptChannelRepositoryShape,
} from "../../src/repositories/prompt-channel-repository";
import {
  PromptRepository,
  type PromptRepositoryShape,
} from "../../src/repositories/prompt-repository";
import {
  PromptVersionRepository,
  type PromptVersionRepositoryShape,
} from "../../src/repositories/prompt-version-repository";
import { PromptCache } from "../../src/services/prompt-cache";
import {
  PromptPublishing,
  PromptPublishingLive,
} from "../../src/services/prompt-publishing";
import { actor, noopCache, promptId, promptRow } from "../fixtures/prompt-rows";

const unreachable = (method: string) => () =>
  Effect.die(`unexpected call to ${method}`);

const promptsWith = (found: boolean): PromptRepositoryShape => ({
  archive: unreachable("archive"),
  findById: () =>
    Effect.succeed(found ? Option.some(promptRow) : Option.none()),
  insert: unreachable("insert"),
  listByOrganization: unreachable("listByOrganization"),
  touch: unreachable("touch"),
  update: unreachable("update"),
});

const channelsWith = (
  rows: readonly ChannelRow[]
): PromptChannelRepositoryShape => ({
  list: () => Effect.succeed(rows),
  move: unreachable("move"),
  resolve: unreachable("resolve"),
});

const versions = Layer.succeed(PromptVersionRepository, {
  append: unreachable("append"),
  byNumber: unreachable("byNumber"),
  latest: unreachable("latest"),
  list: unreachable("list"),
  update: unreachable("update"),
} satisfies PromptVersionRepositoryShape);

const cache = Layer.succeed(PromptCache, noopCache);

const listChannels = (found: boolean, rows: readonly ChannelRow[]) =>
  Effect.runPromiseExit(
    Effect.gen(function* () {
      const publishing = yield* PromptPublishing;
      return yield* publishing.listChannels(actor, promptId);
    }).pipe(
      Effect.provide(
        PromptPublishingLive.pipe(
          Layer.provide(
            Layer.mergeAll(
              Layer.succeed(PromptRepository, promptsWith(found)),
              Layer.succeed(PromptChannelRepository, channelsWith(rows)),
              versions,
              cache
            )
          )
        )
      )
    )
  );

const row = (channel: string, version: number): ChannelRow => ({
  channel,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedBy: { image: null, name: "Ada" },
  version,
  versionInternalId: `pv_${version}`,
});

describe("PromptPublishing.listChannels", () => {
  test("returns every channel with the version it points at", async () => {
    const exit = await listChannels(true, [
      row("production", 3),
      row("staging", 5),
    ]);

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value.map((placement) => placement.channel)).toEqual([
        ChannelName.make("production"),
        ChannelName.make("staging"),
      ]);
      expect(exit.value.map((placement) => Number(placement.version))).toEqual([
        3, 5,
      ]);
    }
  });

  test("keeps the author who last moved the channel", async () => {
    const exit = await listChannels(true, [row("production", 1)]);

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value[0]?.updatedBy?.name).toBe("Ada");
      expect(exit.value[0]?.updatedAt).toBeInstanceOf(Date);
    }
  });

  test("returns nothing when the prompt has no channels", async () => {
    const exit = await listChannels(true, []);

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value).toHaveLength(0);
    }
  });

  test("fails when the prompt does not belong to the actor", async () => {
    const exit = await listChannels(false, []);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(String(exit.cause)).toContain("PromptNotFound");
    }
  });

  test("fails rather than dies when a stored channel name is invalid", async () => {
    const exit = await listChannels(true, [row("NOT A CHANNEL", 1)]);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(String(exit.cause)).not.toContain("Die");
    }
  });
});
