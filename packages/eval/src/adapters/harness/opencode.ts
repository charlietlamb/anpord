import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import { Effect, Option, Redacted, Ref, Stream } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type { HarnessEvent, HarnessUsage } from "../../domain/harness-event";
import type {
  HarnessDriverShape,
  HarnessSessionShape,
  RunHarness,
} from "../../ports/harness";
import { decodeOpencodeLine } from "./opencode-events";
import { installOpencode, OPENCODE_BIN, opencodeEnv } from "./opencode-install";
import { harnessLines, shellQuote } from "./process";

export const opencodeCommand = (request: RunHarness) =>
  [
    `cd ${shellQuote(request.workspace)}`,
    "&&",
    `${OPENCODE_BIN} run --format json`,
    "--auto",
    `--model ${shellQuote(request.model)}`,
    shellQuote(request.prompt),
    "< /dev/null",
  ].join(" ");

const added = (
  current: Option.Option<HarnessUsage>,
  next: HarnessUsage
): HarnessUsage =>
  Option.match(current, {
    onNone: () => next,
    onSome: (found) => ({
      inputTokens: found.inputTokens + next.inputTokens,
      outputTokens: found.outputTokens + next.outputTokens,
      totalTokens: found.totalTokens + next.totalTokens,
    }),
  });

const authOf = (credential: ResolvedCredential) => {
  const authJson = credential.values.authJson;

  return credential.integrationId === "opencode" && authJson
    ? Effect.succeed(authJson)
    : Effect.fail(
        new HarnessUnavailable({
          harness: "opencode",
          reason: "Credential material is incomplete or does not match harness",
        })
      );
};

export const OpencodeDriver: HarnessDriverShape = {
  capabilities: {
    commands: true,
    fileChanges: true,
    streaming: true,
    usage: true,
  },
  harness: "opencode",
  prepare: (input) =>
    Effect.gen(function* () {
      const auth = yield* authOf(Redacted.value(input.credential));
      yield* installOpencode(input.sandbox, input.version);
      return opencodeEnv(Redacted.make(auth));
    }).pipe(Effect.withSpan("Opencode.prepare")),
  run: (request: RunHarness) =>
    Effect.gen(function* () {
      const usage = yield* Ref.make(Option.none<HarnessUsage>());
      const started = yield* Ref.make(false);

      const events = harnessLines(
        "opencode",
        request.sandbox,
        opencodeCommand(request),
        request.env
      ).pipe(
        Stream.mapConcatEffect(({ at, line }) =>
          Effect.gen(function* () {
            const decoded = decodeOpencodeLine(line);
            const step = decoded.usage;

            if (Option.isSome(step)) {
              yield* Ref.update(usage, (current) =>
                Option.some(added(current, step.value))
              );
            }

            const session = decoded.sessionId;
            const opening: HarnessEvent[] = [];

            if (Option.isSome(session) && !(yield* Ref.get(started))) {
              yield* Ref.set(started, true);
              opening.push({
                _tag: "Started",
                at,
                model: request.model,
                sessionId: session.value,
              });
            }

            return [
              ...opening,
              ...Option.match(decoded.event, {
                onNone: (): HarnessEvent[] => [],
                onSome: (event) => [{ ...event, at }],
              }),
            ];
          })
        )
      );

      return {
        events,
        harness: "opencode",
        usage: Ref.get(usage),
        version: request.harnessVersion,
      } satisfies HarnessSessionShape;
    }).pipe(Effect.withSpan("OpencodeRunner.run")),
};
