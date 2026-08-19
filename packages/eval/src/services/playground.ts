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
import { cellKeyOf } from "../domain/cell";
import type { Distribution } from "../domain/distribution";
import { distributionOf } from "../domain/distribution";
import { AgentTrial, type AgentTrialResult } from "./agent-trial";

export interface PlaygroundTask {
  readonly files: Readonly<Record<string, string>>;
  readonly name: string;
  readonly prompt: string;
  readonly setupCommand: string | null;
  readonly verifyCommand: string;
}

export interface StartPlayground {
  readonly credentials: Redacted.Redacted<string>;
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly model: string;
  readonly organizationId: string;
  readonly provider: ProviderName;
  readonly task: PlaygroundTask;
  readonly trials: number;
}

export interface PlaygroundTrial {
  readonly ordinal: number;
  readonly result: Option.Option<AgentTrialResult>;
  readonly status: "queued" | "running" | "settled";
}

export interface PlaygroundRun {
  readonly cellKey: string;
  readonly distribution: Option.Option<Distribution>;
  readonly failure: Option.Option<string>;
  readonly finishedAt: Option.Option<number>;
  readonly harness: HarnessName;
  readonly id: string;
  readonly model: string;
  readonly organizationId: string;
  readonly provider: ProviderName;
  readonly startedAt: number;
  readonly status: "running" | "finished" | "failed";
  readonly taskName: string;
  readonly trials: readonly PlaygroundTrial[];
}

export interface PlaygroundShape {
  /** Every state change, for a client that wants to watch rather than poll. */
  readonly changes: Stream.Stream<PlaygroundRun>;
  readonly get: (
    organizationId: string,
    id: string
  ) => Effect.Effect<Option.Option<PlaygroundRun>>;
  readonly list: (
    organizationId: string
  ) => Effect.Effect<readonly PlaygroundRun[]>;
  /** Starts a run and returns its id immediately. A trial takes tens of
   * seconds, so holding a request open for the answer would fail on any proxy
   * long before it arrived. */
  readonly start: (input: StartPlayground) => Effect.Effect<string>;
}

export class Playground extends Context.Tag("@anpord/eval/Playground")<
  Playground,
  PlaygroundShape
>() {}

const WORKSPACE = "/tmp/anpord-task";

export const PlaygroundLive = Layer.scoped(
  Playground,
  Effect.gen(function* () {
    const agent = yield* AgentTrial;
    const ids = yield* IdGenerator;
    const runs = yield* Ref.make(new Map<string, PlaygroundRun>());

    /* Bounded and dropping: a slow reader must never stall a run that is
       spending money, and a missed intermediate frame costs nothing because
       every message carries the whole run. */
    const changes = yield* PubSub.dropping<PlaygroundRun>(64);

    const publish = (run: PlaygroundRun) =>
      Ref.update(runs, (all) => new Map(all).set(run.id, run)).pipe(
        Effect.zipRight(PubSub.publish(changes, run))
      );

    const settle = (
      run: PlaygroundRun,
      ordinal: number,
      result: AgentTrialResult
    ): PlaygroundRun => ({
      ...run,
      trials: run.trials.map((trial) =>
        trial.ordinal === ordinal
          ? { ordinal, result: Option.some(result), status: "settled" }
          : trial
      ),
    });

    const start = (input: StartPlayground) =>
      Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis;
        const id = yield* ids.generate("evalRun");

        const initial: PlaygroundRun = {
          cellKey: cellKeyOf({
            harness: input.harness,
            harnessVersion: input.harnessVersion,
            model: input.model,
            provider: input.provider,
            taskId: input.task.name,
            taskVersion: "playground",
          }),
          distribution: Option.none(),
          failure: Option.none(),
          finishedAt: Option.none(),
          harness: input.harness,
          id,
          model: input.model,
          organizationId: input.organizationId,
          provider: input.provider,
          startedAt,
          status: "running",
          taskName: input.task.name,
          trials: Array.from({ length: input.trials }, (_, index) => ({
            ordinal: index + 1,
            result: Option.none<AgentTrialResult>(),
            status: "queued" as const,
          })),
        };

        yield* publish(initial);

        /* Forked, so the caller gets an id now and the work continues behind
           it. The fork is daemonised because the request scope closes as soon
           as the response is written. */
        yield* Effect.forkDaemon(
          Effect.gen(function* () {
            const results = yield* Effect.all(
              initial.trials.map((trial) =>
                agent
                  .run({
                    autoStopMinutes: 15,
                    credentials: input.credentials,
                    files: input.task.files,
                    harness: input.harness,
                    harnessVersion: input.harnessVersion,
                    home: "/home/daytona",
                    model: input.model,
                    prompt: input.task.prompt,
                    provider: input.provider,
                    setupCommand: input.task.setupCommand,
                    verifyCommand: input.task.verifyCommand,
                    workspace: WORKSPACE,
                  })
                  .pipe(
                    Effect.tap((result) =>
                      Ref.get(runs).pipe(
                        Effect.flatMap((all) => {
                          const current = all.get(id);
                          return current === undefined
                            ? Effect.void
                            : publish(settle(current, trial.ordinal, result));
                        })
                      )
                    )
                  )
              ),
              { concurrency: input.trials }
            );

            const finishedAt = yield* Clock.currentTimeMillis;
            const current = yield* Ref.get(runs);
            const latest = current.get(id) ?? initial;

            yield* publish({
              ...latest,
              distribution: Option.some(
                distributionOf(results.map((result) => result.outcome))
              ),
              finishedAt: Option.some(finishedAt),
              status: "finished",
            });
          }).pipe(
            Effect.catchAllCause((cause) =>
              Effect.gen(function* () {
                const finishedAt = yield* Clock.currentTimeMillis;
                const current = yield* Ref.get(runs);
                const latest = current.get(id) ?? initial;

                yield* publish({
                  ...latest,
                  failure: Option.some(String(cause)),
                  finishedAt: Option.some(finishedAt),
                  status: "failed",
                });
              })
            )
          )
        );

        return id;
      }).pipe(
        Effect.withSpan("Playground.start", {
          attributes: {
            harness: input.harness,
            provider: input.provider,
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
