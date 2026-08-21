import {
  Clock,
  Context,
  Effect,
  Layer,
  Option,
  type Redacted,
  type Stream,
} from "effect";
import { caseIdentityOf } from "../domain/case-identity";
import { renderPrompt } from "../domain/prompt";
import { RunQuery } from "../repositories/run-query";
import { RunRepository } from "../repositories/run-repository";
import { TaskRepository } from "../repositories/task-repository";
import { TrialRecorder } from "../repositories/trial-record";
import { AgentTrial } from "../services/agent-trial";
import { type GridCase, runGridCell, WORKSPACE } from "./cell";
import { makeLiveRuns } from "./live-runs";
import {
  completeCell,
  type GridCell,
  type GridRunState,
  type GridTask,
  settleTrial,
} from "./state";
import { runToState } from "./stored-run-state";

export interface StartGrid {
  readonly cases: readonly GridCase[];
  readonly credentials: Redacted.Redacted<string>;
  readonly organizationId: string;
  readonly prompt: string;
  readonly startedBy: string | null;
  readonly tasks: readonly GridTask[];
  readonly trials: number;
}

export interface GridRunShape {
  readonly changes: Stream.Stream<GridRunState>;
  /** Reads the record rather than a cache. A run started before the last
   * restart is still here, which is what makes a baseline possible at all. */
  readonly get: (
    organizationId: string,
    id: string
  ) => Effect.Effect<Option.Option<GridRunState>>;
  readonly list: (
    organizationId: string
  ) => Effect.Effect<readonly GridRunState[]>;
  /** Returns an id immediately. A grid takes minutes and spends real money, so
   * a request that held open for the answer would die on any proxy. */
  readonly start: (input: StartGrid) => Effect.Effect<string>;
}

export class GridRun extends Context.Tag("@anpord/eval/GridRun")<
  GridRun,
  GridRunShape
>() {}

const LIST_LIMIT = 100;

export const GridRunLive = Layer.scoped(
  GridRun,
  Effect.gen(function* () {
    const agent = yield* AgentTrial;
    const query = yield* RunQuery;
    const recorder = yield* TrialRecorder;
    const runs = yield* RunRepository;
    const tasks = yield* TaskRepository;

    /* In-flight runs only. The database is the record; this exists so a
       subscriber can watch a cell settle before the run has finished. */
    const live = yield* makeLiveRuns;

    const publish = live.publish;
    const update = live.update;
    const forget = live.forget;

    const registerCases = (input: StartGrid) =>
      Effect.forEach(input.cases, (subject) => {
        const prompt = renderPrompt(input.prompt, { goal: subject.goal });

        return tasks.upsertByIdentity({
          identity: caseIdentityOf({
            goal: subject.goal,
            name: subject.name,
            setupCommand: subject.setup,
            source: subject.source,
            verifyCommand: subject.verify,
            workspace: WORKSPACE,
          }),
          name: subject.name,
          organizationId: input.organizationId,
          prompt,
          setupCommand: subject.setup,
          verifyCommand: subject.verify,
          workspace: WORKSPACE,
        });
      });

    const execute = (
      input: StartGrid,
      created: { readonly id: string; readonly internalId: string },
      registered: readonly {
        readonly id: string;
        readonly internalId: string;
      }[]
    ) =>
      Effect.gen(function* () {
        /* Cells run one after another while trials inside a cell run
           together: the per-provider semaphore is the real ceiling, and
           starting every cell at once would only queue against it. */
        for (const [taskIndex, task] of input.tasks.entries()) {
          for (const [caseIndex, subject] of input.cases.entries()) {
            const row = registered[caseIndex];

            if (row === undefined) {
              continue;
            }

            const position = { caseName: subject.name, taskIndex };

            const result = yield* runGridCell({
              agent,
              credentials: input.credentials,
              onTrial: (ordinal, trial) =>
                update(created.id, (state) =>
                  settleTrial(state, position, ordinal, trial)
                ),
              prompt: input.prompt,
              recorder,
              runInternalId: created.internalId,
              runs,
              subject,
              task,
              taskInternalId: row.internalId,
              taskPublicId: row.id,
              trials: input.trials,
            });

            yield* update(created.id, (state) =>
              completeCell(state, position, result)
            );
          }
        }

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

        /* Each case becomes a task row, because the cell key is hashed over
           the task's identity and version. Without a persisted task there is
           nothing stable for a later run to be compared against. */
        const registered = yield* registerCases(input);

        const cells = input.tasks.flatMap((_, taskIndex) =>
          input.cases.map(
            (subject): GridCell => ({
              caseName: subject.name,
              cellKey: null,
              distribution: Option.none(),
              internalId: null,
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
          tasks: input.tasks,
        });

        /* Forked so the caller gets an id now, daemonised because the request
           scope closes as soon as the response is written. */
        yield* Effect.forkDaemon(
          execute(input, created, registered).pipe(
            /* Logged as well as recorded. A grid that dies inside its own
               daemon leaves a run stuck at running, and without this the only
               evidence is a field nobody reads. */
            Effect.tapErrorCause((cause) =>
              Effect.logError("grid run failed").pipe(
                Effect.annotateLogs({
                  cause: String(cause),
                  runId: created.id,
                })
              )
            ),
            Effect.catchAllCause((cause) =>
              Clock.currentTimeMillis.pipe(
                Effect.flatMap((finishedAt) =>
                  runs
                    .finish({
                      failure: String(cause),
                      finishedAt: new Date(finishedAt),
                      internalId: created.internalId,
                      status: "failed",
                    })
                    .pipe(
                      Effect.ignore,
                      Effect.zipRight(
                        update(created.id, (state) => ({
                          ...state,
                          failure: Option.some(String(cause)),
                          finishedAt: Option.some(finishedAt),
                          status: "failed",
                        })).pipe(Effect.zipRight(forget(created.id)))
                      )
                    )
                )
              )
            )
          )
        );

        return created.id;
      }).pipe(
        Effect.orDie,
        Effect.withSpan("GridRun.start", {
          attributes: {
            cases: input.cases.length,
            tasks: input.tasks.length,
            trials: input.trials,
          },
        })
      );

    /* The live copy wins while a run is in flight, because it carries the
       trials that have landed so far and their journals. Once it is gone the
       record answers, which is what survives a restart. */
    const get = (organizationId: string, id: string) =>
      live.get(id).pipe(
        Effect.flatMap((current) => {
          if (
            Option.isSome(current) &&
            current.value.organizationId === organizationId
          ) {
            return Effect.succeed(current);
          }

          return query
            .findRun(organizationId, id)
            .pipe(Effect.map(Option.map(runToState)), Effect.orDie);
        }),
        Effect.withSpan("GridRun.get")
      );

    return GridRun.of({
      changes: live.changes,
      get,
      list: (organizationId) =>
        query.listRuns({ limit: LIST_LIMIT, organizationId }).pipe(
          Effect.flatMap((rows) =>
            Effect.forEach(rows, (row) =>
              get(organizationId, row.id).pipe(Effect.map(Option.getOrNull))
            )
          ),
          Effect.map((states) =>
            states.filter((state): state is GridRunState => state !== null)
          ),
          Effect.orDie,
          Effect.withSpan("GridRun.list")
        ),
      start,
    });
  })
);
