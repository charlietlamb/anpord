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
import {
  PromptAuthoring,
  PromptAuthoringLive,
} from "../../src/services/prompt-authoring";
import { PromptCache } from "../../src/services/prompt-cache";
import { PromptPublishing } from "../../src/services/prompt-publishing";
import {
  actor,
  noopCache,
  promptId,
  promptRow,
  versionRow,
} from "../fixtures/prompt-rows";

const unreachable = (method: string) => () =>
  Effect.die(`unexpected call to ${method}`);

const prompts = Layer.succeed(PromptRepository, {
  archive: unreachable("archive"),
  findById: () => Effect.succeed(Option.some(promptRow)),
  findByIdIncludingArchived: () => Effect.succeed(Option.some(promptRow)),
  idExists: () => Effect.succeed(true),
  insert: unreachable("insert"),
  listByOrganization: unreachable("listByOrganization"),
  touch: unreachable("touch"),
  update: unreachable("update"),
} satisfies PromptRepositoryShape);

const publishing = Layer.succeed(PromptPublishing, {
  listChannels: unreachable("listChannels"),
  publishVersion: unreachable("publishVersion"),
  setChannel: unreachable("setChannel"),
});

const cache = Layer.succeed(PromptCache, noopCache);

const placement = (channel: string, version: number): ChannelRow => ({
  channel,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedBy: null,
  version,
  versionInternalId: `pv_${version}`,
});

const listVersions = (
  rows: readonly number[],
  placements: readonly ChannelRow[]
) =>
  Effect.runPromiseExit(
    Effect.gen(function* () {
      const authoring = yield* PromptAuthoring;
      return yield* authoring.listVersions(actor, promptId);
    }).pipe(
      Effect.provide(
        PromptAuthoringLive.pipe(
          Layer.provide(
            Layer.mergeAll(
              prompts,
              publishing,
              cache,
              Layer.succeed(PromptVersionRepository, {
                append: unreachable("append"),
                byNumber: unreachable("byNumber"),
                latest: unreachable("latest"),
                list: () =>
                  Effect.succeed(
                    rows.map((version) => versionRow(version, `pv_${version}`))
                  ),
                update: unreachable("update"),
              } satisfies PromptVersionRepositoryShape),
              Layer.succeed(PromptChannelRepository, {
                list: () => Effect.succeed(placements),
                move: unreachable("move"),
                resolve: unreachable("resolve"),
              } satisfies PromptChannelRepositoryShape)
            )
          )
        )
      )
    )
  );

const channelsOf = (
  exit: Exit.Exit<readonly { channel: unknown }[], unknown>
) => (Exit.isSuccess(exit) ? exit.value.map((prompt) => prompt.channel) : null);

describe("PromptAuthoring.listVersions", () => {
  test("puts production on the version it points at, not the newest", async () => {
    const exit = await listVersions([3, 2, 1], [placement("production", 1)]);

    expect(channelsOf(exit)).toEqual([
      null,
      null,
      ChannelName.make("production"),
    ]);
  });

  test("labels each version with its own channel", async () => {
    const exit = await listVersions(
      [3, 2, 1],
      [placement("production", 1), placement("staging", 3)]
    );

    expect(channelsOf(exit)).toEqual([
      ChannelName.make("staging"),
      null,
      ChannelName.make("production"),
    ]);
  });

  test("leaves every version unlabelled when no channel exists", async () => {
    const exit = await listVersions([2, 1], []);

    expect(channelsOf(exit)).toEqual([null, null]);
  });

  test("prefers production when two channels point at one version", async () => {
    const exit = await listVersions(
      [2, 1],
      [placement("staging", 2), placement("production", 2)]
    );

    expect(channelsOf(exit)).toEqual([ChannelName.make("production"), null]);
  });

  test("picks deterministically when several non-production channels collide", async () => {
    const exit = await listVersions(
      [1],
      [placement("staging", 1), placement("canary", 1)]
    );

    expect(channelsOf(exit)).toEqual([ChannelName.make("canary")]);
  });

  test("fails rather than dies when a stored channel name is invalid", async () => {
    const exit = await listVersions([1], [placement("NOT A CHANNEL", 1)]);

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(String(exit.cause)).not.toContain("Die");
    }
  });
});
