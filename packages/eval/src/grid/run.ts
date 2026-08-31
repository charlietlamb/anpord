import { Clock, Context, Effect, Layer, Option, type Stream } from "effect";
import { SourceTokens } from "../codebase/source-token";
import { caseIdentityOf } from "../domain/case-identity";
import { CellKey } from "../domain/cell";
import type { PageCursor } from "../domain/page";
import { pageOf, pageSizeOf } from "../domain/page";
import { renderPrompt } from "../domain/prompt";
import { ModelPrices } from "../ports/model-source";
import { TrialRunner } from "../ports/trial-runner";
import { EventRepository } from "../repositories/event-repository";
import { RunQuery } from "../repositories/run-query";
import { RunRepository } from "../repositories/run-repository";
import { TaskRepository } from "../repositories/task-repository";
import { TrialRecorder } from "../repositories/trial-record";
import { AgentTrial } from "../services/agent-trial";
import { Baselines } from "../services/baselines";
import { type GridCase, runGridCell } from "./cell";
import { forEachGridCell } from "./for-each-cell";
import { makeLiveRuns } from "./live-runs";
import {
  advanceTrial,
  completeCell,
  type GridCell,
  type GridExecutionTask,
  type GridRunState,
  settleTrial,
} from "./state";
import { runToState } from "./stored-run-state";
import { WORKSPACE } from "./trial";

export interface ResumeGrid {
  readonly created: { readonly id: string; readonly internalId: string };
  readonly input: StartGrid;
  readonly registered: readonly {
    readonly id: string;
    readonly internalId: string;
  }[];
}

export interface StartGrid {
  readonly cases: readonly GridCase[];
  readonly organizationId: string;
  readonly prompt: string;
  readonly startedBy: string | null;
  readonly tasks: readonly GridExecutionTask[];
  readonly trials: number;
}

/** A page of runs, where the next one starts, and how many there are in all. */
export interface GridRunPage {
  readonly next: PageCursor | null;
  readonly runs: readonly GridRunState[];
  /** Every run the organization has, so a reader can be told how far the
   * listing goes rather than only whether another page exists. */
  readonly total: number;
}

export interface GridRunShape {
  readonly changes: Stream.Stream<GridRunState>;

  readonly get: (
    organizationId: string,
    id: string
  ) => Effect.Effect<Option.Option<GridRunState>>;
  readonly list: (input: {
    /** Null on the first page. */
    readonly cursor: PageCursor | null;
    readonly limit: number | undefined;
    readonly organizationId: string;
  }) => Effect.Effect<GridRunPage>;

  readonly resume: (grid: ResumeGrid) => Effect.Effect<void>;
  readonly start: (input: StartGrid) => Effect.Effect<string>;
}

export class GridRun extends Context.Tag("@anpord/eval/GridRun")<
  GridRun,
  GridRunShape
>() {}

export const GridRunLive = Layer.scoped(
  GridRun,
  Effect.gen(function* () {
    const agent = yield* AgentTrial;
    const baselines = yield* Baselines;
    /* Taken once and provided to the forked run below, so pricing stays a
       detail of executing a grid rather than something every caller of
       `start` has to hold. */
    const prices = yield* ModelPrices;
    const query = yield* RunQuery;
    const events = yield* EventRepository;
    const recorder = yield* TrialRecorder;
    const runs = yield* RunRepository;
    const tasks = yield* TaskRepository;
    const runner = yield* TrialRunner;
    const sourceTokens = yield* SourceTokens;

    const live = yield* makeLiveRuns;

    const publish = live.publish;
    const update = live.update;
    const forget = live.forget;

    const registerCases = (input: StartGrid) =>
      Effect.forEach(
        input.cases,
        (subject) => {
          const prompt = renderPrompt(input.prompt, subject.variables);

          return tasks.upsertByIdentity({
            identity:
              subject.identity ??
              caseIdentityOf({
                name: subject.name,
                prepare: subject.prepare,
                source: subject.source,
                validator: subject.validator,
                variables: subject.variables,
                verifyCommand: subject.verify,
                workspace: WORKSPACE,
              }),
            name: subject.name,
            organizationId: input.organizationId,
            prompt,
            prepare: subject.prepare ?? null,
            source: subject.source,
            validator: subject.validator ?? null,
            verifyCommand: subject.verify,
            workspace: WORKSPACE,
          });
        },
        { concurrency: 4 }
      );

    const execute = (
      input: StartGrid,
      created: { readonly id: string; readonly internalId: string },
      registered: readonly {
        readonly id: string;
        readonly internalId: string;
      }[]
    ) =>
      Effect.gen(function* () {
        const sourceToken = Option.getOrUndefined(
          yield* sourceTokens.forOrganization(input.organizationId)
        );

        yield* forEachGridCell(
          input.cases,
          input.tasks,
          (subject, task, caseIndex, taskIndex) =>
            Effect.gen(function* () {
              const row = registered[caseIndex];

              if (row === undefined) {
                return;
              }

              const position = { caseName: subject.name, taskIndex };

              const result = yield* runGridCell({
                agent,
                onProgress: (ordinal, journal) =>
                  update(created.id, (state) =>
                    advanceTrial(state, position, ordinal, journal)
                  ),
                onTrial: (ordinal, trial) =>
                  update(created.id, (state) =>
                    settleTrial(state, position, ordinal, trial)
                  ),
                prompt: input.prompt,
                recorder,
                runInternalId: created.internalId,
                runs,
                sourceToken,
                subject,
                task,
                taskInternalId: row.internalId,
                taskPublicId: row.id,
                trials: input.trials,
              });

              yield* update(created.id, (state) =>
                completeCell(state, position, result)
              );

              yield* baselines
                .promoteIfAbsent({
                  cellInternalId: result.internalId,
                  cellKey: CellKey.make(result.cellKey),
                  organizationId: input.organizationId,
                })
                .pipe(Effect.ignoreLogged);
            })
        );

        const finishedAt = yield* Clock.currentTimeMillis;

        yield* runs.finish({
          failure: null,
          finishedAt: new Date(finishedAt),
          internalId: created.internalId,
          status: "finished",
        });

        yield* update(created.id, (state) => ({
          ...state,
          finishedAt: Option.some(finishedAt),
          status: "finished",
        }));

        yield* forget(created.id);
      });

    const start = (input: StartGrid) =>
      Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis;
        const cellCount = input.cases.length * input.tasks.length;

        const created = yield* runs.insert({
          cellCount,
          organizationId: input.organizationId,
          startedBy: input.startedBy,
          trialCount: cellCount * input.trials,
        });

        const registered = yield* registerCases(input);

        const cells = input.tasks.flatMap((_, taskIndex) =>
          input.cases.map(
            (subject): GridCell => ({
              caseName: subject.name,
              cellKey: null,
              distribution: Option.none(),
              internalId: null,
              live: new Map(),
              setup: Option.some({
                prompt: renderPrompt(input.prompt, subject.variables),
                repoRef:
                  subject.source.kind === "repo" ? subject.source.ref : null,
                repoUrl:
                  subject.source.kind === "repo" ? subject.source.url : null,
                prepareName: subject.prepare?.name ?? null,
                validatorName: subject.validator?.name ?? null,
                verifyCommand: subject.verify,
                workspace: WORKSPACE,
              }),
              status: "running",
              taskIndex,
              trials: Array.from({ length: input.trials }, () => Option.none()),
            })
          )
        );

        yield* publish({
          cases: input.cases.map((subject) => subject.name),
          cells,
          failure: Option.none(),
          finishedAt: Option.none(),
          id: created.id,
          organizationId: input.organizationId,
          startedAt,
          status: "running",
          tasks: input.tasks.map(
            ({ bindings: _, credentials: __, ...task }) => task
          ),
        });

        yield* runner.dispatch({
          grid: { created, input, registered },
          organizationId: input.organizationId,
          runId: created.id,
          work: resume({ created, input, registered }),
        });

        return created.id;
      }).pipe(
        /* Logged before it is turned into a defect: a start that fails takes
           its tag with it through orDie, and a run row saying only "failed"
           is the whole of what anybody could see. */
        Effect.tapErrorCause((cause) =>
          Effect.logError("grid run could not start", cause)
        ),
        Effect.orDie,
        Effect.withSpan("GridRun.start", {
          attributes: {
            cases: input.cases.length,
            tasks: input.tasks.length,
            trials: input.trials,
          },
        })
      );

    const get = (organizationId: string, id: string) =>
      live.get(id).pipe(
        Effect.flatMap((current) => {
          if (
            Option.isSome(current) &&
            current.value.organizationId === organizationId
          ) {
            return Effect.succeed(current);
          }

          return query.findRun(organizationId, id).pipe(
            Effect.flatMap((found) => {
              if (Option.isNone(found)) {
                return Effect.succeedNone;
              }

              const trialIds = found.value.cells.flatMap((cell) =>
                cell.trials.map((trial) => trial.internalId)
              );

              return events
                .listByTrials(trialIds)
                .pipe(
                  Effect.map((journals) =>
                    Option.some(runToState(found.value, journals))
                  )
                );
            }),
            Effect.orDie
          );
        }),
        Effect.withSpan("GridRun.get")
      );

    const resume = (grid: ResumeGrid) =>
      execute(grid.input, grid.created, grid.registered).pipe(
        Effect.provideService(ModelPrices, prices),
        Effect.annotateLogs({ runId: grid.created.id }),
        Effect.orDie
      );

    return GridRun.of({
      changes: live.changes,
      get,
      resume,
      list: (input) =>
        Effect.gen(function* () {
          const size = pageSizeOf(input.limit);

          /* Together: the count is a second query and waiting for it after
             the page would add its latency to every step. */
          const { rows, total } = yield* Effect.all(
            {
              rows: query.listRuns({
                cursor: input.cursor,
                limit: size,
                organizationId: input.organizationId,
              }),
              total: query.countRuns(input.organizationId),
            },
            { concurrency: 2 }
          );

          const page = pageOf(rows, size);

          const current = yield* Effect.forEach(
            page.items,
            (row) => live.get(row.id),
            { concurrency: "unbounded" }
          );
          const storedRows = page.items.filter((_, index) =>
            Option.isNone(current[index] ?? Option.none())
          );
          const stored = yield* query.hydrateRuns(storedRows);
          const storedById = new Map(
            stored.map((detail) => [detail.run.id, runToState(detail)])
          );
          const states = page.items.flatMap((row, index) =>
            Option.match(current[index] ?? Option.none(), {
              onNone: () => {
                const state = storedById.get(row.id);
                return state === undefined ? [] : [state];
              },
              onSome: (state) =>
                state.organizationId === input.organizationId ? [state] : [],
            })
          );

          const last = page.items.at(-1);

          return {
            next:
              page.hasMore && last !== undefined
                ? { id: last.id, startedAtMillis: last.createdAt.getTime() }
                : null,
            runs: states,
            total,
          };
        }).pipe(Effect.orDie, Effect.withSpan("GridRun.list")),
      start,
    });
  })
);
