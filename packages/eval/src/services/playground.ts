import { IdGenerator } from "@anpord/ids/id";
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
import type { HarnessName, ProviderName } from "../domain/cell";
import { type Distribution, distributionOf } from "../domain/distribution";
import { renderPrompt } from "../domain/prompt";
import { AgentTrial, type AgentTrialResult } from "./agent-trial";
import type { WorkspaceSource } from "./workspace";

/** A case is a dataset row: what the agent is asked to do, where the code
 * comes from, and the command that decides whether it worked. */
export interface PlaygroundCase {
  readonly goal: string;
  readonly name: string;
  readonly setup: string | null;
  readonly source: WorkspaceSource;
  readonly verify: string;
}

/** A column: one harness, one model, one sandbox. */
export interface PlaygroundTask {
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly model: string;
  readonly provider: ProviderName;
}

export interface StartPlayground {
  readonly cases: readonly PlaygroundCase[];
  readonly credentials: Redacted.Redacted<string>;
  readonly organizationId: string;
  readonly prompt: string;
  readonly tasks: readonly PlaygroundTask[];
  readonly trials: number;
}

export interface PlaygroundCell {
  readonly caseName: string;
  readonly distribution: Option.Option<Distribution>;
  readonly status: "running" | "finished" | "failed";
  readonly taskIndex: number;
  readonly trials: readonly Option.Option<AgentTrialResult>[];
}

export interface PlaygroundRun {
  readonly cases: readonly string[];
  readonly cells: readonly PlaygroundCell[];
  readonly failure: Option.Option<string>;
  readonly finishedAt: Option.Option<number>;
  readonly id: string;
  readonly organizationId: string;
  readonly startedAt: number;
  readonly status: "running" | "finished" | "failed";
  readonly tasks: readonly PlaygroundTask[];
}

export interface PlaygroundShape {
  readonly changes: Stream.Stream<PlaygroundRun>;
  readonly get: (
    organizationId: string,
    id: string
  ) => Effect.Effect<Option.Option<PlaygroundRun>>;
  readonly list: (
    organizationId: string
  ) => Effect.Effect<readonly PlaygroundRun[]>;
  /** Starts a run and returns its id immediately. A trial takes tens of
   * seconds and spends real money, so a request that held open for the answer
   * would die on any proxy long before it arrived. */
  readonly start: (input: StartPlayground) => Effect.Effect<string>;
}

export class Playground extends Context.Tag("@anpord/eval/Playground")<
  Playground,
  PlaygroundShape
>() {}

const WORKSPACE = "/tmp/anpord-task";
const HOME = "/home/daytona";
const AUTO_STOP_MINUTES = 15;

const cellKey = (taskIndex: number, caseName: string) =>
  `${taskIndex}:${caseName}`;

export const PlaygroundLive = Layer.scoped(
  Playground,
  Effect.gen(function* () {
    const agent = yield* AgentTrial;
    const ids = yield* IdGenerator;
    const runs = yield* Ref.make(new Map<string, PlaygroundRun>());

    /* Bounded and dropping: a slow reader must never stall a run that is
       spending money, and a missed frame costs nothing because every message
       carries the whole run. */
    const changes = yield* PubSub.dropping<PlaygroundRun>(64);

    const publish = (run: PlaygroundRun) =>
      Ref.update(runs, (all) => new Map(all).set(run.id, run)).pipe(
        Effect.zipRight(PubSub.publish(changes, run))
      );

    const update = (
      id: string,
      change: (run: PlaygroundRun) => PlaygroundRun
    ) =>
      Ref.get(runs).pipe(
        Effect.flatMap((all) => {
          const current = all.get(id);
          return current === undefined ? Effect.void : publish(change(current));
        })
      );

    const settle = (
      run: PlaygroundRun,
      key: string,
      ordinal: number,
      result: AgentTrialResult
    ): PlaygroundRun => ({
      ...run,
      cells: run.cells.map((cell) =>
        cellKey(cell.taskIndex, cell.caseName) === key
          ? {
              ...cell,
              trials: cell.trials.map((trial, index) =>
                index === ordinal - 1 ? Option.some(result) : trial
              ),
            }
          : cell
      ),
    });

    const complete = (run: PlaygroundRun, key: string): PlaygroundRun => ({
      ...run,
      cells: run.cells.map((cell) => {
        if (cellKey(cell.taskIndex, cell.caseName) !== key) {
          return cell;
        }

        const outcomes = cell.trials.flatMap((trial) =>
          Option.match(trial, {
            onNone: () => [],
            onSome: (result) => [result.outcome],
          })
        );

        return {
          ...cell,
          distribution: Option.some(distributionOf(outcomes)),
          status: "finished" as const,
        };
      }),
    });

    /** One square of the grid: N trials of one task against one case. */
    const runCell = (
      input: StartPlayground,
      id: string,
      taskIndex: number,
      task: PlaygroundTask,
      subject: PlaygroundCase
    ) => {
      const key = cellKey(taskIndex, subject.name);

      return Effect.all(
        Array.from({ length: input.trials }, (_, index) =>
          agent
            .run({
              autoStopMinutes: AUTO_STOP_MINUTES,
              credentials: input.credentials,
              harness: task.harness,
              harnessVersion: task.harnessVersion,
              home: HOME,
              model: task.model,
              prompt: renderPrompt(input.prompt, { goal: subject.goal }),
              provider: task.provider,
              setupCommand: subject.setup,
              source: subject.source,
              verifyCommand: subject.verify,
              workspace: WORKSPACE,
            })
            .pipe(
              Effect.tap((result) =>
                update(id, (run) => settle(run, key, index + 1, result))
              )
            )
        ),
        { concurrency: input.trials }
      ).pipe(Effect.zipRight(update(id, (run) => complete(run, key))));
    };

    const start = (input: StartPlayground) =>
      Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis;
        const id = yield* ids.generate("evalRun");

        const cells = input.tasks.flatMap((_, taskIndex) =>
          input.cases.map(
            (subject): PlaygroundCell => ({
              caseName: subject.name,
              distribution: Option.none(),
              status: "running",
              taskIndex,
              trials: Array.from({ length: input.trials }, () =>
                Option.none<AgentTrialResult>()
              ),
            })
          )
        );

        yield* publish({
          cases: input.cases.map((subject) => subject.name),
          cells,
          failure: Option.none(),
          finishedAt: Option.none(),
          id,
          organizationId: input.organizationId,
          startedAt,
          status: "running",
          tasks: input.tasks,
        });

        /* Forked, so the caller gets an id now and the work continues behind
           it. Daemonised because the request scope closes as soon as the
           response is written. */
        yield* Effect.forkDaemon(
          Effect.gen(function* () {
            /* Cells run one after another while trials inside a cell run
               together: the per-provider semaphore is the real ceiling, and
               starting every cell at once would only queue against it. */
            for (const [taskIndex, task] of input.tasks.entries()) {
              for (const subject of input.cases) {
                yield* runCell(input, id, taskIndex, task, subject);
              }
            }

            const finishedAt = yield* Clock.currentTimeMillis;

            yield* update(id, (run) => ({
              ...run,
              finishedAt: Option.some(finishedAt),
              status: "finished",
            }));
          }).pipe(
            Effect.catchAllCause((cause) =>
              Clock.currentTimeMillis.pipe(
                Effect.flatMap((finishedAt) =>
                  update(id, (run) => ({
                    ...run,
                    failure: Option.some(String(cause)),
                    finishedAt: Option.some(finishedAt),
                    status: "failed",
                  }))
                )
              )
            )
          )
        );

        return id;
      }).pipe(
        Effect.withSpan("Playground.start", {
          attributes: {
            cases: input.cases.length,
            tasks: input.tasks.length,
            trials: input.trials,
          },
        })
      );

    const owned = (organizationId: string) => (run: PlaygroundRun) =>
      run.organizationId === organizationId;

    return Playground.of({
      changes: Stream.fromPubSub(changes),
      get: (organizationId, id) =>
        Ref.get(runs).pipe(
          Effect.map((all) =>
            Option.fromNullable(all.get(id)).pipe(
              Option.filter(owned(organizationId))
            )
          )
        ),
      list: (organizationId) =>
        Ref.get(runs).pipe(
          Effect.map((all) =>
            [...all.values()]
              .filter(owned(organizationId))
              .sort((left, right) => right.startedAt - left.startedAt)
          )
        ),
      start,
    });
  })
);
