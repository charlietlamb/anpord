import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Database } from "@anpord/db/client";
import type { HarnessProfile } from "@anpord/schema/domain/harness-profile";
import { Effect, ManagedRuntime } from "effect";
import { Batches } from "../../src/batch/batches";
import {
  profileOfRequest,
  type RequestedProfile,
} from "../../src/domain/harness-profile";
import { profileVersionOf } from "../../src/domain/profile-identity";
import { HarnessProfileRepository } from "../../src/repositories/harness-profile-repository";
import type { AgentTrialRequest } from "../../src/services/agent-trial";
import { EvalReads } from "../../src/services/eval-reads";
import { skipWithoutDatabase } from "../fixtures/database";
import { seedOrganization } from "../fixtures/eval-rows";
import {
  actorOf,
  capturingRunner,
  caseOf,
  evalStack,
  requestOf,
  scriptedAgent,
  seedConnections,
  variantOf,
} from "../fixtures/eval-stack";

const suffix = Date.now();
const organizationId = `org_profiles_${suffix}`;
const seen: AgentTrialRequest[] = [];

const runtime = ManagedRuntime.make(
  evalStack({ agent: scriptedAgent(seen), runner: capturingRunner([]) })
);

const run = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    Batches | Database | EvalReads | HarnessProfileRepository
  >
) => runtime.runPromise(effect);

const profile = (name: string, agents: string): HarnessProfile => ({
  env: { SAMPLE_MODE: "strict" },
  files: { "workspace/AGENTS.md": agents },
  name,
  systemPrompt: "You are the sample agent.\n",
});

const register = (subject: RequestedProfile) =>
  Effect.flatMap(HarnessProfileRepository, (profiles) =>
    profiles.insertIfAbsent({
      ...subject,
      base: "opencode",
      organizationId,
      version: profileVersionOf(subject),
    })
  );

const requested = (subject: HarnessProfile) => {
  const found = profileOfRequest(subject);
  if (found === null) {
    throw new Error("a profile was given");
  }
  return found;
};

describe.skipIf(skipWithoutDatabase())("harness profiles in the record", () => {
  beforeAll(async () => {
    await run(
      Database.pipe(
        Effect.flatMap((db) =>
          Effect.promise(async () => {
            await seedOrganization(db, organizationId);
            await seedConnections(db, organizationId);
          })
        )
      )
    );
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  it("returns the row it already has rather than writing a second", async () => {
    const subject = requested(profile("sample", "# Sample\n"));
    const [first, second] = await run(
      Effect.all([register(subject), register(subject)])
    );

    expect(second.internalId).toBe(first.internalId);
    expect(second.version).toBe(first.version);
    expect(second.files).toEqual(subject.files);
  });

  it("gives an edited profile a new row on the same name", async () => {
    const [first, edited] = await run(
      Effect.all([
        register(requested(profile("edited", "# Sample\n"))),
        register(requested(profile("edited", "# Sample, revised\n"))),
      ])
    );

    expect(edited.internalId).not.toBe(first.internalId);
    expect(edited.version).not.toBe(first.version);
  });

  it("keeps two profiles on one base as two variants and hands each its own files", async () => {
    const alpha = profile("alpha", "# Alpha\n");
    const beta = profile("beta", "# Beta\n");
    const read = await run(
      Effect.gen(function* () {
        const batches = yield* Batches;
        const started = yield* batches.start(
          actorOf(organizationId),
          requestOf({
            cases: [caseOf("profiled", { variables: { task: "use it" } })],
            trigger: {
              source: "ci",
              url: "https://github.com/acme/app/actions/runs/123",
            },
            trials: 3,
            variants: [
              variantOf({
                harness: "opencode",
                model: "anthropic/claude-sonnet-4.6",
                profile: alpha,
              }),
              variantOf({
                harness: "opencode",
                model: "anthropic/claude-sonnet-4.6",
                profile: beta,
              }),
            ],
          })
        );
        yield* batches.execute(started.id);
        return yield* (yield* EvalReads).batch(organizationId, started.id);
      })
    );

    expect(read.trigger).toEqual({
      source: "ci",
      url: "https://github.com/acme/app/actions/runs/123",
    });
    expect(read.runs.map((entry) => entry.variant.profile).toSorted()).toEqual([
      "alpha",
      "beta",
    ]);
    expect(new Set(read.runs.map((entry) => entry.variant.id)).size).toBe(2);
    expect(read.runs.map((entry) => entry.profileVersion).toSorted()).toEqual(
      [
        profileVersionOf(requested(alpha)),
        profileVersionOf(requested(beta)),
      ].toSorted()
    );
    expect(read.runs.every((entry) => entry.trials.length === 3)).toBe(true);
    expect(
      seen
        .map((request) => request.profile?.files["workspace/AGENTS.md"])
        .toSorted()
    ).toEqual([
      "# Alpha\n",
      "# Alpha\n",
      "# Alpha\n",
      "# Beta\n",
      "# Beta\n",
      "# Beta\n",
    ]);
    expect(
      seen.every((request) => request.profile?.env?.SAMPLE_MODE === "strict")
    ).toBe(true);
  });
});
