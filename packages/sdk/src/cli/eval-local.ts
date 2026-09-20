import { credentialResolverFrom } from "@anpord/eval/credentials/env-resolver";
import { profileOfRequest } from "@anpord/eval/domain/harness-profile";
import { EvalLocalLive, evalLocalWith } from "@anpord/eval/local-layer";
import { LocalTrials } from "@anpord/eval/services/local-trial";
import type {
  PublicStartEvalRequest,
  ReportedTrial,
} from "@anpord/schema/public/evals-api";
import { ConfigProvider, Effect, Option } from "effect";
import { localEnv } from "./local-env";
import { note } from "./render";

export interface LocalCase {
  readonly durationMs: number;
  readonly name: string;
  readonly status: string;
}

/* Everything a local run needs is on this machine, so one trial per case is
   the whole grid: there is no baseline here to be repeatable against. */
export interface LocalRunOptions {
  readonly credentials?: Readonly<Record<string, string>>;
  readonly onTrial?: (trial: ReportedTrial) => Effect.Effect<void>;
}

export const runLocally = (
  request: PublicStartEvalRequest,
  options: LocalRunOptions = {}
) =>
  Effect.gen(function* () {
    const trials = yield* LocalTrials;
    const forwarded = localEnv(process.cwd());
    const task = request.tasks[0];

    if (task === undefined) {
      return [] as readonly LocalCase[];
    }

    return yield* Effect.forEach(
      request.cases,
      (subject) =>
        trials
          .run({
            caseName: subject.name,
            forwarded,
            harness: task.harness,
            harnessVersion: "local",
            model: task.model,
            prepare: subject.prepare ?? null,
            profile: profileOfRequest(task.profile),
            prompt: request.prompt,
            source: { kind: "empty" },
            user: subject.user ?? null,
            validator: subject.validator ?? null,
            verifyCommand: subject.verify,
          })
          .pipe(
            Effect.tap(
              (outcome) =>
                options.onTrial?.({
                  caseName: subject.name,
                  events: outcome.events,
                  ordinal: 0,
                  outcome: outcome.outcome,
                  sandboxId: outcome.result.sandboxId,
                  taskIndex: 0,
                  usage: Option.getOrNull(outcome.result.usage),
                }) ?? Effect.void
            ),
            Effect.map(
              (outcome): LocalCase => ({
                durationMs: outcome.durationMs,
                name: subject.name,
                status: outcome.outcome.status,
              })
            )
          ),
      { concurrency: 1 }
    );
  }).pipe(
    Effect.provide(
      options.credentials === undefined
        ? EvalLocalLive
        : evalLocalWith(credentialResolverFrom(options.credentials))
    ),
    Effect.scoped,
    /* Passing the flag is the opt-in the adapter's gate asks for: whoever runs
       the command is the person whose machine it runs on. The environment can
       still say no, so an explicit setting is left to win. */
    Effect.withConfigProvider(
      ConfigProvider.fromEnv().pipe(
        ConfigProvider.orElse(() =>
          ConfigProvider.fromMap(new Map([["ANPORD_LOCAL_SANDBOX", "true"]]))
        )
      )
    )
  );

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export const reportLocal = (file: string, cases: readonly LocalCase[]) =>
  Effect.forEach(
    [
      `${file}: ${cases.length} case(s) on this machine`,
      ...cases.map(
        (one) => `  ${one.status} ${one.name} ${seconds(one.durationMs)}`
      ),
    ],
    note
  );

export const localProblems = (cases: readonly LocalCase[]) =>
  cases.flatMap((one) =>
    one.status === "passed" ? [] : [`${one.name} ${one.status}`]
  );
