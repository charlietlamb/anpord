import {
  Clock,
  Context,
  Effect,
  Layer,
  Option,
  PubSub,
  type Redacted,
  Ref,
  Stream,
} from "effect";
import { caseIdentityOf } from "../domain/case-identity";
import { renderPrompt } from "../domain/prompt";
import { RunQuery } from "../repositories/run-query";
import { RunRepository } from "../repositories/run-repository";
import { TaskRepository } from "../repositories/task-repository";
import { TrialRecorder } from "../repositories/trial-record";
import { AgentTrial } from "./agent-trial";
import { type GridCase, runGridCell, WORKSPACE } from "./grid-cell";
import {
  completeCell,
  type GridCell,
  type GridRunState,
  type GridTask,
  settleTrial,
} from "./grid-state";
import { runToState } from "./grid-view";

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
    const live = yield* Ref.make(new Map<string, GridRunState>());

    /* Bounded and dropping: a slow reader must never stall a run that is
       spending money, and a missed frame costs nothing because every message
       carries the whole run. */
    const changes = yield* PubSub.dropping<GridRunState>(64);

    const publish = (state: GridRunState) =>
      Ref.update(live, (all) => new Map(all).set(state.id, state)).pipe(
        Effect.zipRight(PubSub.publish(changes, state))
      );

    const update = (
      id: string,
      change: (state: GridRunState) => GridRunState
    ) =>
      Ref.get(live).pipe(
        Effect.flatMap((all) => {
          const current = all.get(id);

          return current === undefined ? Effect.void : publish(change(current));
        })
      );

    /* Resolved by content, never inserted fresh. The cell key is hashed over
       the task, so a new row per run gave every run its own key and a
       promoted baseline could never match a later run: comparison across
       time, the one thing this exists for, was impossible. */
    const registerCases = (input: StartGrid) =>
      Effect.forEach(input.cases, (subject) => {
        const prompt = renderPrompt(input.prompt, { goal: subject.goal });

        return tasks.upsertByIdentity({
          identity: caseIdentityOf({
            name: subject.name,
            prompt,
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

        yield* runs.finish(created.internalId, new Date(finishedAt));

        yield* update(created.id, (state) => ({
          ...state,
          finishedAt: Option.some(finishedAt),
          status: "finished",
        }));
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
                  runs.finish(created.internalId, new Date(finishedAt)).pipe(
                    Effect.ignore,
                    Effect.zipRight(
                      update(created.id, (state) => ({
                        ...state,
                        failure: Option.some(String(cause)),
                        finishedAt: Option.some(finishedAt),
                        status: "failed",
                      }))
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
      Ref.get(live).pipe(
        Effect.flatMap((all) => {
          const current = all.get(id);

          if (
            current !== undefined &&
            current.organizationId === organizationId
          ) {
            return Effect.succeed(Option.some(current));
          }

          return query
            .findRun(organizationId, id)
            .pipe(Effect.map(Option.map(runToState)), Effect.orDie);
        })
      );

    return GridRun.of({
      changes: Stream.fromPubSub(changes),
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
          Effect.orDie
        ),
      start,
    });
  })
);
