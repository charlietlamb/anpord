import type { evalPlayground } from "@anpord/db/schema/evals/eval-playgrounds";
import { Context, Effect, Layer, Option, type Redacted } from "effect";
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
  /** Starts the saved configuration and records which run it produced.
   *
   * Returns as soon as the run is recorded. The work continues behind the
   * response, so closing the tab does not stop it and coming back reads the
   * run from the record rather than from a session that ended. */
  readonly run: (input: {
    readonly credentials: Redacted.Redacted<string>;
    readonly harnessVersion: string;
    readonly id: string;
    readonly organizationId: string;
    readonly startedBy: string | null;
  }) => Effect.Effect<string, EvalStoreError | NotRunnable>;
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
    const grid = yield* GridRun;
    const store = yield* WorkbenchRepository;

    /* A config that no longer decodes is replaced by an empty one rather than
       failing the read. A playground is a draft, and a shape change should
       cost somebody their unsaved columns at worst, never their access to the
       page. */
    const configOf = (row: Row) =>
      decodePlaygroundConfig(row.config).pipe(
        Effect.orElseSucceed(() => emptyPlaygroundConfig)
      );

    const hydrate = (row: Row) =>
      configOf(row).pipe(Effect.map((config) => asWorkbench(row, config)));

    const run = (input: {
      readonly credentials: Redacted.Redacted<string>;
      readonly harnessVersion: string;
      readonly id: string;
      readonly organizationId: string;
      readonly startedBy: string | null;
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

        const runId = yield* grid.start({
          /* The absent verifier travels as absent. Substituting one that
             always succeeds made an ungated cell report a perfect,
             deterministic, promotable pass rate from no evidence at all. */
          cases: config.cases.map((subject) => ({
            goal: subject.goal,
            name: subject.name,
            setup: subject.setup,
            source: subject.source,
            verify: subject.verify,
          })),
          credentials: input.credentials,
          organizationId: input.organizationId,
          prompt: config.prompt,
          startedBy: input.startedBy,
          tasks: config.columns.map((column) => ({
            harness: column.harness,
            harnessVersion: input.harnessVersion,
            model: column.model,
            provider: column.provider,
          })),
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
