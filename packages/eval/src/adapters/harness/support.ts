import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import { Effect, Redacted, Ref, Stream } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type { HarnessEvent, HarnessUsage } from "../../domain/harness-event";
import { EMPTY_TALLY, tallied, totalOf } from "../../domain/usage-tally";
import type {
  HarnessSessionShape,
  PrepareHarness,
  RunHarness,
} from "../../ports/harness";
import { runCommand } from "../sandbox/run-command";
import { harnessLines, shellQuote } from "./process";

const PREFIX = "~/.local";

export interface DecodedOutput {
  readonly events?: readonly HarnessEvent[];
  readonly model?: string;
  readonly sessionId?: string;
  readonly usage?: HarnessUsage;
  /**
   * Whether `usage` restates the run's total rather than one turn's share.
   *
   * The two cannot be told apart by looking at the numbers, and adding a
   * cumulative report to the turns it already contains counts every token
   * twice. Only the decoder knows which its harness emits -- Claude sends
   * per-turn usage on each message and a cumulative total at the end -- so
   * the decoder is what says so.
   */
  readonly usageIsCumulative?: boolean;
}

export const installNpmHarness = (
  input: PrepareHarness,
  harness: RunHarness["harness"],
  packageName: string,
  scripts = false
) =>
  runCommand(
    input.sandbox,
    `npm i -g --prefix ${PREFIX} ${scripts ? "" : "--ignore-scripts "}${shellQuote(`${packageName}@${input.version}`)} >/dev/null 2>&1`,
    { timeoutMs: 300_000 }
  ).pipe(
    Effect.mapError(
      (cause) => new HarnessUnavailable({ harness, reason: cause.reason })
    ),
    Effect.withSpan(`${harness}.install`, {
      attributes: { version: input.version },
    })
  );

export const credentialOf = (
  input: PrepareHarness,
  harness: RunHarness["harness"]
): Effect.Effect<ResolvedCredential, HarnessUnavailable> => {
  const credential = Redacted.value(input.credential);

  return credential.integrationId === harness
    ? Effect.succeed(credential)
    : Effect.fail(
        new HarnessUnavailable({
          harness,
          reason: "Credential integration does not match harness",
        })
      );
};

export const requiredValue = (
  credential: ResolvedCredential,
  harness: RunHarness["harness"],
  name: string
) => {
  const value = credential.values[name];

  return value
    ? Effect.succeed(value)
    : Effect.fail(
        new HarnessUnavailable({
          harness,
          reason: `Credential field ${name} is missing`,
        })
      );
};

export const writeHarnessFile = (
  input: PrepareHarness,
  harness: RunHarness["harness"],
  path: string,
  content: string
) =>
  input.sandbox
    .writeFile(path, content)
    .pipe(
      Effect.mapError(
        (cause) => new HarnessUnavailable({ harness, reason: cause.reason })
      )
    );

/** Whether the model a harness reports is the one that was asked for.
 *
 * An alias names a family and the harness reports the member it resolved to:
 * `opus` comes back as `claude-opus-4-8`. Only a report that names neither
 * the id nor the family is a different model, which is the swap this check
 * exists to catch. */
export const reportsModel = (requested: string, reported: string) =>
  reported === requested || reported.includes(requested);

export const jsonSession = (
  request: RunHarness,
  command: string,
  decode: (line: string, at: number) => DecodedOutput,
  verifyModel = false
) =>
  Effect.gen(function* () {
    const usage = yield* Ref.make(EMPTY_TALLY);
    const started = yield* Ref.make(false);

    const events = harnessLines(
      request.harness,
      request.sandbox,
      command,
      request.env
    ).pipe(
      Stream.mapConcatEffect(({ at, line }) =>
        Effect.gen(function* () {
          const decoded = decode(line, at);

          if (
            verifyModel &&
            decoded.model !== undefined &&
            !reportsModel(request.model, decoded.model)
          ) {
            return yield* Effect.fail(
              new HarnessUnavailable({
                harness: request.harness,
                reason: `Harness reported model ${decoded.model} instead of ${request.model}`,
              })
            );
          }

          if (decoded.usage !== undefined) {
            const reported = decoded.usage;
            const cumulative = decoded.usageIsCumulative ?? false;

            yield* Ref.update(usage, (tally) =>
              tallied(tally, reported, cumulative)
            );
          }

          const opening: HarnessEvent[] = [];

          if (decoded.sessionId !== undefined && !(yield* Ref.get(started))) {
            yield* Ref.set(started, true);
            opening.push({
              _tag: "Started",
              at,
              model: decoded.model ?? request.model,
              sessionId: decoded.sessionId,
            });
          }

          return [...opening, ...(decoded.events ?? [])];
        })
      )
    );

    return {
      events,
      harness: request.harness,
      usage: Ref.get(usage).pipe(Effect.map(totalOf)),
      version: request.harnessVersion,
    } satisfies HarnessSessionShape;
  });
