import type { evalPlayground } from "@anpord/db/schema/evals/eval-playgrounds";
import type { Actor } from "@anpord/schema/domain/actor";
import { Context, Effect, Layer, Option } from "effect";
import type { CredentialError } from "../credentials/errors";
import { CredentialResolver } from "../credentials/resolver";
import { resolveTaskCredentials } from "../credentials/tasks";
import type { EvalStoreError } from "../domain/errors";
import { NotRunnable } from "../domain/errors";
import {
  decodePlaygroundConfig,
  emptyPlaygroundConfig,
  type PlaygroundConfig,
  readinessOf,
} from "../domain/playground-config";
import { GridRun } from "../grid/run";
import { WorkbenchRepository } from "../repositories/workbench-repository";
import { HarnessVersions } from "./harness-versions";

export interface Workbench {
  readonly config: PlaygroundConfig;
  readonly id: string;
  readonly lastRunId: string | null;
  readonly name: string;
  readonly updatedAt: Date;
}

export interface WorkbenchShape {
  readonly create: (input: {
    readonly actorId: string | null;
    readonly name: string;
    readonly organizationId: string;
  }) => Effect.Effect<Workbench, EvalStoreError>;
  readonly find: (
    organizationId: string,
    id: string
  ) => Effect.Effect<Option.Option<Workbench>, EvalStoreError>;
  readonly list: (
    organizationId: string
  ) => Effect.Effect<readonly Workbench[], EvalStoreError>;
  readonly run: (input: {
    readonly actor: Actor;
    readonly id: string;
    readonly organizationId: string;
    readonly startedBy: string | null;
    readonly legacyHarnessAuth: string;
  }) => Effect.Effect<string, CredentialError | EvalStoreError | NotRunnable>;
  readonly save: (input: {
    readonly config: PlaygroundConfig;
    readonly id: string;
    readonly name: string;
    readonly organizationId: string;
  }) => Effect.Effect<Workbench, EvalStoreError>;
}

export class Workbenches extends Context.Tag("@anpord/eval/Workbenches")<
  Workbenches,
  WorkbenchShape
>() {}

type Row = typeof evalPlayground.$inferSelect;

const credentialsOf = (
  connections: PlaygroundConfig["connections"],
  column: PlaygroundConfig["columns"][number]
) => ({
  harnessConnectionId: connections[column.harness],
  sandboxConnectionId: connections[column.provider],
});

const asWorkbench = (row: Row, config: PlaygroundConfig): Workbench => ({
  config,
  id: row.id,
  lastRunId: row.lastRunId,
  name: row.name,
  updatedAt: row.updatedAt,
});

export const WorkbenchesLive = Layer.effect(
  Workbenches,
  Effect.gen(function* () {
    const credentials = yield* CredentialResolver;
    const grid = yield* GridRun;
    const store = yield* WorkbenchRepository;
    const versions = yield* HarnessVersions;

    const configOf = (row: Row) =>
      decodePlaygroundConfig(row.config).pipe(
        Effect.orElseSucceed(() => emptyPlaygroundConfig)
      );

    const hydrate = (row: Row) =>
      configOf(row).pipe(Effect.map((config) => asWorkbench(row, config)));

    const run = (input: {
      readonly actor: Actor;
      readonly id: string;
      readonly organizationId: string;
      readonly startedBy: string | null;
      readonly legacyHarnessAuth: string;
    }) =>
      Effect.gen(function* () {
        const found = yield* store.find(input.organizationId, input.id);

        if (Option.isNone(found)) {
          return yield* Effect.fail(
            new NotRunnable({ id: input.id, problems: ["no such playground"] })
          );
        }

        const config = yield* configOf(found.value);
        const problems = readinessOf(config);

        if (problems.length > 0) {
          return yield* Effect.fail(
            new NotRunnable({ id: input.id, problems })
          );
        }

        const requested = yield* Effect.forEach(config.columns, (column) =>
          versions.version(column.harness).pipe(
            Effect.map((harnessVersion) => ({
              ...column,
              credentials: credentialsOf(config.connections, column),
              harnessVersion,
              /* A workbench column names a harness and a model only; a profile
                 is declared beside an eval, which a workbench has none of. */
              profile: null,
            }))
          )
        );
        const tasks = yield* resolveTaskCredentials(
          credentials,
          input.actor,
          requested,
          input.legacyHarnessAuth
        );

        const runId = yield* grid.start({
          cases: config.cases.map((subject) => ({
            name: subject.name,
            prepare: null,
            source: subject.source,
            variables: subject.variables,
            validator: null,
            verify: subject.verify,
          })),
          name: found.value.name,
          organizationId: input.organizationId,
          prompt: config.prompt,
          startedBy: input.startedBy,
          tasks,
          trials: config.trials,
        });

        yield* store.markRun(found.value.internalId, runId);

        return runId;
      }).pipe(
        Effect.withSpan("Workbenches.run"),
        Effect.annotateLogs({
          organizationId: input.organizationId,
          playgroundId: input.id,
        })
      );

    return Workbenches.of({
      create: (input) =>
        store.insert(input).pipe(
          Effect.map((row) => asWorkbench(row, emptyPlaygroundConfig)),
          Effect.withSpan("Workbenches.create")
        ),
      find: (organizationId, id) =>
        store.find(organizationId, id).pipe(
          Effect.flatMap((found) =>
            Option.match(found, {
              onNone: () => Effect.succeed(Option.none<Workbench>()),
              onSome: (row) => hydrate(row).pipe(Effect.map(Option.some)),
            })
          ),
          Effect.withSpan("Workbenches.find")
        ),
      list: (organizationId) =>
        store.list(organizationId).pipe(
          Effect.flatMap((rows) => Effect.forEach(rows, hydrate)),
          Effect.withSpan("Workbenches.list")
        ),
      run,
      save: (input) =>
        store.update(input).pipe(
          Effect.map((row) => asWorkbench(row, input.config)),
          Effect.withSpan("Workbenches.save")
        ),
    });
  })
);
