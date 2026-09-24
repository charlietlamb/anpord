import { credentialResolverFrom } from "@anpord/eval/credentials/env-resolver";
import { profileOfRequest } from "@anpord/eval/domain/harness-profile";
import { asEntries } from "@anpord/eval/domain/journal-entries";
import { EvalLocalLive, evalLocalWith } from "@anpord/eval/local-layer";
import { HarnessVersions } from "@anpord/eval/services/harness-versions";
import { LocalTrials } from "@anpord/eval/services/local-trial";
import type {
  EvalCase,
  EvalVariantRequest,
  StartBatchRequest,
} from "@anpord/schema/domain/eval-definition";
import type { EvalHarness } from "@anpord/schema/domain/evals";
import type { TokenCounts } from "@anpord/schema/domain/usage-health";
import type { ReportedTrial } from "@anpord/schema/public/runner-api";
import { Array as Arr, ConfigProvider, Effect, Option } from "effect";
import { localEnv } from "./local-env";
import { note } from "./render";
import { makeTranscriber } from "./transcriber";
import { terminalStyle } from "./transcript-writer";
import { formatVariant } from "./variant-label";

export interface LocalCase {
  readonly durationMs: number;
  readonly name: string;
  readonly ordinal: number;
  readonly status: string;
  readonly turns: number;
  readonly usage: TokenCounts | null;
  readonly variant: string;
}

type LocalTrial = Omit<ReportedTrial, "runId">;

export interface LocalSlot {
  readonly caseId: string;
  readonly variant: EvalVariantRequest;
}

export interface LocalRunOptions {
  readonly credentials?: (
    harness: EvalHarness
  ) => Readonly<Record<string, string>> | undefined;
  readonly onTrial?: (
    slot: LocalSlot,
    trial: LocalTrial
  ) => Effect.Effect<void>;
}

export const labelOfRequest = (variant: EvalVariantRequest) =>
  formatVariant({
    harness: variant.harness,
    model: variant.model,
    profile: variant.profile?.name ?? null,
  });

const localConfig = ConfigProvider.fromEnv().pipe(
  ConfigProvider.orElse(() =>
    ConfigProvider.fromMap(new Map([["ANPORD_LOCAL_SANDBOX", "true"]]))
  )
);

type Transcriber = Effect.Effect.Success<ReturnType<typeof makeTranscriber>>;

const printed = (lines: readonly string[]) =>
  lines.length === 0 ? Effect.void : note(lines.join("\n"));

const runVariant = (
  request: StartBatchRequest,
  variant: EvalVariantRequest,
  transcript: Transcriber,
  options: LocalRunOptions
) =>
  Effect.gen(function* () {
    const trials = yield* LocalTrials;
    const harnessVersion = yield* (yield* HarnessVersions).version(
      variant.harness
    );
    const forwarded = localEnv(process.cwd());
    const label = labelOfRequest(variant);
    const ordinals = Arr.range(1, request.trials);

    const runTrial = (subject: EvalCase, ordinal: number) => {
      const speaker = {
        caseName: subject.name,
        key: `${subject.id}#${label}#${ordinal}`,
        ordinal: request.trials > 1 ? ordinal : null,
        variant: label,
      };

      return trials
        .run({
          caseName: subject.name,
          forwarded,
          harness: variant.harness,
          harnessVersion,
          model: variant.model,
          onProgress: (events) =>
            transcript
              .transcribe(
                events.flatMap(asEntries).map((entry) => ({ entry, speaker }))
              )
              .pipe(Effect.flatMap(printed)),
          prepare: subject.prepare ?? null,
          profile: profileOfRequest(variant.profile),
          prompt: request.suite.prompt,
          source: subject.source ?? { kind: "empty" },
          user: subject.user ?? null,
          validator: subject.validator ?? null,
          verifyCommand: subject.verify,
        })
        .pipe(
          Effect.tap(
            (outcome) =>
              options.onTrial?.(
                { caseId: subject.id, variant },
                {
                  events: outcome.events,
                  ordinal,
                  outcome: outcome.outcome,
                  sandboxId: outcome.result.sandboxId,
                  usage: Option.getOrNull(outcome.result.usage),
                }
              ) ?? Effect.void
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
              ordinal,
              status: outcome.outcome.status,
              turns: outcome.outcome.commandCount,
              usage: Option.getOrNull(outcome.result.usage),
              variant: label,
            })
          )
        );
    };

    return yield* Effect.forEach(
      request.cases.flatMap((subject) =>
        ordinals.map((ordinal) => [subject, ordinal] as const)
      ),
      ([subject, ordinal]) => runTrial(subject, ordinal),
      { concurrency: 1 }
    );
  }).pipe(
    Effect.provide(
      Option.match(
        Option.fromNullable(options.credentials?.(variant.harness)),
        {
          onNone: () => EvalLocalLive,
          onSome: (values) => evalLocalWith(credentialResolverFrom(values)),
        }
      )
    ),
    Effect.scoped
  );

export const runLocally = (
  request: StartBatchRequest,
  options: LocalRunOptions = {}
) =>
  Effect.gen(function* () {
    const transcript = yield* makeTranscriber(
      terminalStyle(process.stderr.isTTY === true)
    );

    const results = yield* Effect.forEach(
      request.variants,
      (variant) => runVariant(request, variant, transcript, options),
      { concurrency: 1 }
    );

    return results.flat();
  }).pipe(Effect.withConfigProvider(localConfig));
