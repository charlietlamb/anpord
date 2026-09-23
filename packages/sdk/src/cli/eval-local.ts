import { credentialResolverFrom } from "@anpord/eval/credentials/env-resolver";
import { profileOfRequest } from "@anpord/eval/domain/harness-profile";
import { asEntries } from "@anpord/eval/domain/journal-entries";
import { EvalLocalLive, evalLocalWith } from "@anpord/eval/local-layer";
import { HarnessVersions } from "@anpord/eval/services/harness-versions";
import { LocalTrials } from "@anpord/eval/services/local-trial";
import type { TokenCounts } from "@anpord/schema/domain/usage-health";
import type {
  PublicStartEvalRequest,
  ReportedTrial,
} from "@anpord/schema/public/evals-api";
import { ConfigProvider, Effect, Option } from "effect";
import { localUsageLines } from "./eval-usage";
import { localEnv } from "./local-env";
import { note } from "./render";
import { makeTranscriber } from "./transcriber";
import { terminalStyle } from "./transcript-writer";

export interface LocalCase {
  readonly durationMs: number;
  readonly name: string;
  readonly status: string;
  readonly turns: number;
  readonly usage: TokenCounts | null;
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
    const versions = yield* HarnessVersions;
    const forwarded = localEnv(process.cwd());
    const task = request.variants[0];

    if (task === undefined) {
      return [] as readonly LocalCase[];
    }

    const harnessVersion = yield* versions.version(task.harness);
    const transcript = yield* makeTranscriber(
      terminalStyle(process.stderr.isTTY === true)
    );
    const printed = (lines: readonly string[]) =>
      lines.length === 0 ? Effect.void : note(lines.join("\n"));

    return yield* Effect.forEach(
      request.cases,
      (subject) => {
        const speaker = {
          caseName: subject.name,
          key: subject.name,
          ordinal: null,
          variant: `${task.harness}/${task.model}`,
        };

        return trials
          .run({
            caseName: subject.name,
            forwarded,
            harness: task.harness,
            harnessVersion,
            model: task.model,
            onProgress: (events) =>
              transcript
                .transcribe(
                  events.flatMap(asEntries).map((entry) => ({ entry, speaker }))
                )
                .pipe(Effect.flatMap(printed)),
            prepare: subject.prepare ?? null,
            profile: profileOfRequest(task.profile),
            prompt: request.prompt,
            source: subject.source ?? { kind: "empty" },
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
                  variantIndex: 0,
                  usage: Option.getOrNull(outcome.result.usage),
                }) ?? Effect.void
            ),
            Effect.tap((outcome) =>
              transcript
                .settle([{ speaker, verdict: outcome.outcome }])
                .pipe(Effect.flatMap(printed))
            ),
            Effect.map(
              (outcome): LocalCase => ({
                durationMs: outcome.durationMs,
                name: subject.name,
                status: outcome.outcome.status,
                turns: outcome.outcome.commandCount,
                usage: Option.getOrNull(outcome.result.usage),
              })
            )
          );
      },
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
      ...localUsageLines(cases),
    ],
    note
  );

export const localProblems = (cases: readonly LocalCase[]) =>
  cases.flatMap((one) =>
    one.status === "passed" ? [] : [`${one.name} ${one.status}`]
  );
