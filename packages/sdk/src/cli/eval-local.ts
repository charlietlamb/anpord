import {
  credentialResolverFrom,
  type LocalCredentials,
} from "@sphynx/eval/credentials/env-resolver";
import { caseDefinitionOf } from "@sphynx/eval/domain/case-definition";
import { profileOfRequest } from "@sphynx/eval/domain/harness-profile";
import { asEntries } from "@sphynx/eval/domain/journal-entries";
import { EvalLocalLive, evalLocalWith } from "@sphynx/eval/local-layer";
import { HarnessVersions } from "@sphynx/eval/services/harness-versions";
import { LocalTrials } from "@sphynx/eval/services/local-trial";
import type {
  EvalCase,
  EvalVariantRequest,
  StartBatchRequest,
} from "@sphynx/schema/domain/eval-definition";
import type { HarnessEvent } from "@sphynx/schema/domain/harness-event";
import {
  Array as Arr,
  Cause,
  Clock,
  Config,
  ConfigProvider,
  Effect,
  Option,
  Ref,
} from "effect";
import { localEnv } from "./local-env";
import {
  brokenBy,
  type LocalTrialResult,
  localCaseOf,
  verdictOf,
} from "./local-trial-result";
import { note } from "./render";
import { makeTranscriber } from "./transcriber";
import { stderrStyle } from "./transcript-writer";
import { formatVariant } from "./variant-label";

export interface LocalSlot {
  readonly caseId: string;
  readonly variant: EvalVariantRequest;
}

export interface LocalRunOptions {
  readonly credentials?: LocalCredentials;
  readonly onTrial?: (
    slot: LocalSlot,
    result: LocalTrialResult,
    ordinal: number
  ) => Effect.Effect<void>;
}

export const labelOfRequest = (variant: EvalVariantRequest) =>
  formatVariant({
    harness: variant.harness,
    model: variant.model,
    profile: variant.profile?.name ?? null,
  });

const casesAtOnce = Config.string("EVAL_LOCAL_CASES_AT_ONCE").pipe(
  Config.withDefault("1"),
  Config.map((value) =>
    value === "unbounded" ? ("unbounded" as const) : Number.parseInt(value, 10)
  ),
  Config.validate({
    message: "EVAL_LOCAL_CASES_AT_ONCE must be a positive number or unbounded",
    validation: (value) => value === "unbounded" || value > 0,
  })
);

const localConfig = ConfigProvider.fromEnv().pipe(
  ConfigProvider.orElse(() =>
    ConfigProvider.fromMap(new Map([["SPHYNX_LOCAL_SANDBOX", "true"]]))
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

    const attempt = (subject: EvalCase, ordinal: number) =>
      Effect.gen(function* () {
        const speaker = {
          caseName: subject.name,
          key: `${subject.id}#${label}#${ordinal}`,
          ordinal: request.trials > 1 ? ordinal : null,
          variant: label,
        };
        const definition = caseDefinitionOf(request.suite, subject);
        const heard = yield* Ref.make<readonly HarnessEvent[]>([]);
        const startedAt = yield* Clock.currentTimeMillis;
        const elapsed = Clock.currentTimeMillis.pipe(
          Effect.map((now) => now - startedAt)
        );

        const result = yield* trials
          .run({
            caseName: subject.name,
            forwarded,
            harness: variant.harness,
            harnessVersion,
            maxTurns: definition.maxTurns,
            model: variant.model,
            onProgress: (events) =>
              Ref.update(heard, (held) => [...held, ...events]).pipe(
                Effect.zipRight(
                  transcript.transcribe(
                    events
                      .flatMap(asEntries)
                      .map((entry) => ({ entry, speaker }))
                  )
                ),
                Effect.flatMap(printed)
              ),
            prepare: definition.prepare,
            profile: profileOfRequest(variant.profile),
            prompt: definition.prompt,
            source: definition.source,
            timeoutMs: definition.timeoutMs,
            user: definition.user,
            validator: definition.validator,
            verifyCommand: definition.verify,
          })
          .pipe(
            Effect.map(
              (ran): LocalTrialResult => ({
                commands: ran.outcome.commandCount,
                durationMs: ran.durationMs,
                events: ran.events,
                kind: "scored",
                outcome: ran.outcome,
                sandboxId: ran.result.sandboxId,
                usage: Option.getOrNull(ran.result.usage),
                userSpend: Option.getOrNull(ran.result.userSpend),
              })
            ),
            Effect.catchAllCause((cause) =>
              Cause.isInterruptedOnly(cause)
                ? Effect.failCause(cause)
                : Effect.zipWith(elapsed, Ref.get(heard), (ms, events) =>
                    brokenBy(cause, ms, events)
                  )
            )
          );

        yield* options.onTrial?.(
          { caseId: subject.id, variant },
          result,
          ordinal
        ) ?? Effect.void;
        yield* transcript
          .settle([{ speaker, verdict: verdictOf(result) }])
          .pipe(Effect.flatMap(printed));

        return localCaseOf(result, {
          name: subject.name,
          ordinal,
          variant: label,
        });
      });

    return yield* Effect.forEach(
      request.cases.flatMap((subject) =>
        ordinals.map((ordinal) => [subject, ordinal] as const)
      ),
      ([subject, ordinal]) => attempt(subject, ordinal),
      { concurrency: yield* casesAtOnce }
    );
  }).pipe(
    Effect.provide(
      options.credentials === undefined
        ? EvalLocalLive
        : evalLocalWith(credentialResolverFrom(options.credentials))
    ),
    Effect.scoped
  );

export const runLocally = (
  request: StartBatchRequest,
  options: LocalRunOptions = {}
) =>
  Effect.gen(function* () {
    const transcript = yield* makeTranscriber(stderrStyle());

    const results = yield* Effect.forEach(
      request.variants,
      (variant) => runVariant(request, variant, transcript, options),
      { concurrency: 1 }
    );

    return results.flat();
  }).pipe(Effect.withConfigProvider(localConfig));
