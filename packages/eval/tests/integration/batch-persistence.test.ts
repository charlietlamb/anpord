import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Database } from "@anpord/db/client";
import { Effect, Layer, ManagedRuntime, Redacted } from "effect";
import { HarnessesLive } from "../../src/adapters/harness/resolve";
import { ScorerGroundTruthLive } from "../../src/adapters/scorers/ground-truth";
import { Batches } from "../../src/batch/batches";
import { CredentialError } from "../../src/credentials/errors";
import { CredentialResolver } from "../../src/credentials/resolver";
import { EvalSandboxLive } from "../../src/layer";
import { SimulatedUserSilent } from "../../src/ports/simulated-user";
import { AgentTrialLive } from "../../src/services/agent-trial";
import { EvalReads } from "../../src/services/eval-reads";
import { SuspenderSleeping } from "../../src/services/suspender";
import { fixedSource, VERIFY_COMMAND } from "../fixtures/broken-task";
import {
  codexCredential,
  hasCodex,
  hasDatabase,
  hasDaytona,
} from "../fixtures/credentials";
import { seedConnection, seedOrganization } from "../fixtures/eval-rows";
import {
  actorOf,
  capturingRunner,
  caseOf,
  evalStack,
  requestOf,
  variantOf,
} from "../fixtures/eval-stack";

const READY = hasCodex && hasDatabase && hasDaytona;
const suffix = Date.now();
const organizationId = `org_persist_${suffix}`;
const connectionId = `conn_persist_${suffix}`;

const codexOnly = Layer.succeed(
  CredentialResolver,
  CredentialResolver.of({
    persist: () => Effect.void,
    resolve: ({ integrationId }) =>
      integrationId === "codex"
        ? Effect.succeed(
            Redacted.make({
              ...Redacted.value(codexCredential),
              connectionId,
            })
          )
        : Effect.fail(
            new CredentialError({ code: "not-found", message: "not connected" })
          ),
    resolveBound: () => Effect.succeed(codexCredential),
  })
);

const runtime = ManagedRuntime.make(
  evalStack({
    agent: AgentTrialLive.pipe(
      Layer.provide(
        Layer.mergeAll(
          HarnessesLive,
          ScorerGroundTruthLive,
          SimulatedUserSilent,
          SuspenderSleeping,
          codexOnly
        )
      ),
      Layer.provide(EvalSandboxLive)
    ),
    resolver: codexOnly,
    runner: capturingRunner([]),
  })
);

describe.skipIf(!READY)("a batch persists and reads back", () => {
  beforeAll(async () => {
    await runtime.runPromise(
      Database.pipe(
        Effect.flatMap((db) =>
          Effect.promise(async () => {
            await seedOrganization(db, organizationId);
            await seedConnection(db, {
              id: connectionId,
              integrationId: "codex",
              organizationId,
            });
          })
        )
      )
    );
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  it(
    "runs a real agent, persists every trial, and reads the run back",
    async () => {
      const batch = await runtime.runPromise(
        Effect.gen(function* () {
          const batches = yield* Batches;
          const started = yield* batches.start(
            actorOf(organizationId),
            requestOf({
              cases: [
                caseOf("already-passing", {
                  source: fixedSource,
                  variables: {
                    task: "the tests already pass, change nothing",
                  },
                  verify: VERIFY_COMMAND,
                }),
              ],
              trials: 2,
              variants: [variantOf({ model: "gpt-5-codex" })],
            })
          );
          yield* batches.execute(started.id);
          return yield* (yield* EvalReads).batch(organizationId, started.id);
        })
      );
      const [found] = batch.runs;

      expect(batch.status).toBe("finished");
      expect(found?.status).toBe("finished");
      expect(found?.trials).toHaveLength(2);
      expect(found?.distribution.scored).toBe(2);
      expect(found?.distribution.passRate).toBe(1);
    },
    { timeout: 300_000 }
  );
});
