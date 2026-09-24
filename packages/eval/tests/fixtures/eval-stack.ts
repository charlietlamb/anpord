import type { Database } from "@anpord/db/client";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Actor, OrganizationId, UserId } from "@anpord/schema/domain/actor";
import type {
  EvalCase,
  EvalVariantRequest,
  StartBatchRequest,
} from "@anpord/schema/domain/eval-definition";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import type { TrialOutcome } from "@anpord/schema/domain/trial";
import { Effect, Layer, Option, Redacted } from "effect";
import { BatchesLive } from "../../src/batch/batches";
import { SourceTokensNone } from "../../src/codebase/source-token";
import { CredentialError } from "../../src/credentials/errors";
import {
  CredentialResolver,
  type ResolveCredential,
} from "../../src/credentials/resolver";
import { SandboxUnavailable } from "../../src/domain/errors";
import { ModelPrices } from "../../src/ports/model-source";
import { RunBellSilent } from "../../src/ports/run-bell";
import { SimulatedUserSilent } from "../../src/ports/simulated-user";
import { TrialRunner } from "../../src/ports/trial-runner";
import { BatchRepositoryLive } from "../../src/repositories/batch-repository";
import { CatalogRepositoryLive } from "../../src/repositories/catalog-repository";
import { EventRepositoryLive } from "../../src/repositories/event-repository";
import { HarnessProfileRepositoryLive } from "../../src/repositories/harness-profile-repository";
import { JournalArchiveLive } from "../../src/repositories/journal-archive";
import { TrialCostRepositoryLive } from "../../src/repositories/trial-cost-repository";
import { TrialRecorderLive } from "../../src/repositories/trial-record";
import {
  AgentTrial,
  type AgentTrialRequest,
  type AgentTrialResult,
} from "../../src/services/agent-trial";
import { EvalReadsLive } from "../../src/services/eval-reads";
import { HarnessVersionsLive } from "../../src/services/harness-versions";
import { testDatabase } from "./database";
import { seedConnection } from "./eval-rows";

const CONNECTED = ["codex", "claude", "daytona", "e2b", "env", "openai"];

export const connectionOf = (organizationId: string, integrationId: string) =>
  `conn_${organizationId}_${integrationId}`;

export const seedConnections = (db: Database["Type"], organizationId: string) =>
  Promise.all(
    CONNECTED.map((integrationId) =>
      seedConnection(db, {
        id: connectionOf(organizationId, integrationId),
        integrationId,
        organizationId,
      })
    )
  );

const credential = (
  organizationId: string,
  integrationId: string,
  connectionId?: string
) =>
  Redacted.make({
    authMethodId: "api-key",
    connectionId: connectionId ?? connectionOf(organizationId, integrationId),
    integrationId,
    revision: 1,
    values: { apiKey: `${integrationId}-key` },
  });

const missing = (integrationId: string) =>
  new CredentialError({
    code: "not-found",
    message: `nothing connected for ${integrationId}`,
  });

const connectedResolver = Layer.succeed(
  CredentialResolver,
  CredentialResolver.of({
    persist: () => Effect.void,
    resolve: (input: ResolveCredential) =>
      CONNECTED.includes(input.integrationId) ||
      input.connectionId !== undefined
        ? Effect.succeed(
            credential(
              input.actor.organizationId,
              input.integrationId,
              input.connectionId
            )
          )
        : Effect.fail(missing(input.integrationId)),
    resolveBound: (input) =>
      Effect.succeed(
        credential(input.organizationId, "bound", input.connectionId)
      ),
  })
);

export const events: readonly HarnessEvent[] = [
  { _tag: "Started", at: 1000, model: "gpt-5", sessionId: "session_1" },
  { _tag: "Command", at: 2000, command: "npm test", exitCode: 0, output: "ok" },
  { _tag: "Finished", at: 3000, reason: "done" },
];

const outcomeFor = (status: "failed" | "passed"): TrialOutcome => ({
  artifacts: [],
  commandCount: status === "passed" ? 3 : 7,
  exitCode: status === "passed" ? 0 : 1,
  modelMs: 100,
  sandboxMs: 50,
  status,
  validations: [],
  verifySteps: [],
  voidFields: [],
});

export const UNREACHABLE = "unreachable";
export const FAILING = "fails";

export const scriptedAgent = (seen: AgentTrialRequest[] = []) =>
  Layer.succeed(
    AgentTrial,
    AgentTrial.of({
      run: (request) =>
        Effect.gen(function* () {
          seen.push(request);
          if (request.prompt.includes(UNREACHABLE)) {
            return yield* new SandboxUnavailable({
              provider: request.provider,
              reason: "the provider refused every sandbox",
            });
          }
          const sandboxId = `sbx-${request.model}`;
          yield* request.onSandbox?.(sandboxId) ?? Effect.void;
          yield* request.progress?.append(events, 0).pipe(Effect.orDie) ??
            Effect.void;
          const status = request.prompt.includes(FAILING) ? "failed" : "passed";
          return {
            commands: status === "passed" ? 3 : 7,
            events,
            failedCommands: 0,
            filesChanged: [],
            outcome: outcomeFor(status),
            prepared: {},
            sandboxId,
            sessionId: "session_1",
            usage: Option.none(),
          } satisfies AgentTrialResult;
        }),
    })
  );

export interface Dispatched {
  readonly batchId: string;
  readonly work: Effect.Effect<void>;
}

export const capturingRunner = (dispatched: Dispatched[]) =>
  Layer.succeed(
    TrialRunner,
    TrialRunner.of({
      dispatch: ({ batchId, work }) =>
        Effect.sync(() => {
          dispatched.push({ batchId, work });
        }),
    })
  );

export const refusingRunner = Layer.succeed(
  TrialRunner,
  TrialRunner.of({
    dispatch: () => Effect.dieMessage("no worker would take the batch"),
  })
);

const RepositoriesLive = Layer.mergeAll(
  BatchRepositoryLive,
  CatalogRepositoryLive,
  EventRepositoryLive,
  HarnessProfileRepositoryLive,
  TrialCostRepositoryLive,
  TrialRecorderLive
).pipe(Layer.provide(IdGeneratorLive), Layer.provide(JournalArchiveLive));

export const evalStack = <E>(input: {
  readonly agent: Layer.Layer<AgentTrial, E>;
  readonly runner: Layer.Layer<TrialRunner>;
  readonly resolver?: Layer.Layer<CredentialResolver>;
}) =>
  Layer.mergeAll(BatchesLive, EvalReadsLive).pipe(
    Layer.provide(
      Layer.mergeAll(
        input.agent,
        input.runner,
        RunBellSilent,
        SimulatedUserSilent,
        SourceTokensNone,
        HarnessVersionsLive,
        Layer.succeed(ModelPrices, { forModel: () => Effect.succeedNone })
      )
    ),
    Layer.provideMerge(input.resolver ?? connectedResolver),
    Layer.provideMerge(RepositoriesLive),
    Layer.provideMerge(testDatabase(8))
  );

export const actorOf = (organizationId: string) =>
  Actor.make({
    id: UserId.make(`user_${organizationId}`),
    isUser: false,
    organizationId: OrganizationId.make(organizationId),
    permissions: [],
  });

export const caseOf = (
  id: string,
  overrides: Partial<EvalCase> = {}
): EvalCase => ({
  id,
  name: id,
  prepare: null,
  source: { kind: "empty" },
  tags: [],
  user: null,
  validator: null,
  variables: {},
  verify: "npm test",
  ...overrides,
});

export const variantOf = (
  overrides: Partial<EvalVariantRequest> = {}
): EvalVariantRequest => ({
  harness: "codex",
  model: "gpt-5",
  sandbox: "daytona",
  ...overrides,
});

export const requestOf = (
  overrides: Partial<StartBatchRequest> & Pick<StartBatchRequest, "cases">
): StartBatchRequest => ({
  local: false,
  suite: { id: "checkout", name: "Checkout", prompt: "{{task}}" },
  trials: 1,
  trigger: { source: "ci" },
  variants: [variantOf()],
  ...overrides,
});
