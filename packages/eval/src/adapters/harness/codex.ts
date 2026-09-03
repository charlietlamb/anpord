import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import { Effect, Option, Redacted, Ref, Stream } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type { HarnessUsage } from "../../domain/harness-event";
import type {
  HarnessDriverShape,
  HarnessSessionShape,
  RunHarness,
} from "../../ports/harness";
import { decodeCodexLine } from "./codex-events";
import { authenticateCodex, CODEX_BIN, installCodex } from "./codex-install";
import { noPending, timeLine } from "./codex-timing";
import { harnessLines, shellQuote } from "./process";

/* A ChatGPT account chooses its own model and refuses any name. */
const ACCOUNT_CHOOSES_MODEL = "ANPORD_CODEX_ACCOUNT_MODEL";

const accountChoosesModel = (request: RunHarness) =>
  request.model === "" || request.env[ACCOUNT_CHOOSES_MODEL] === "1";

export const codexCommand = (request: RunHarness) =>
  [
    `cd ${shellQuote(request.workspace)}`,
    "&&",
    `${CODEX_BIN} exec --json --skip-git-repo-check`,
    "--dangerously-bypass-approvals-and-sandbox",
    ...(accountChoosesModel(request)
      ? []
      : [`--model ${shellQuote(request.model)}`]),
    shellQuote(request.prompt),
    "< /dev/null",
  ].join(" ");

const authModeOf = (auth: string) =>
  Option.liftThrowable(JSON.parse)(auth).pipe(
    Option.flatMap((value: unknown) =>
      Option.fromNullable((value as { auth_mode?: string })?.auth_mode)
    ),
    Option.getOrElse(() => "apikey")
  );

const authOf = (credential: ResolvedCredential) => {
  if (
    credential.integrationId !== "codex" &&
    credential.integrationId !== "env"
  ) {
    return Effect.fail(
      new HarnessUnavailable({
        harness: "codex",
        reason: "Credential integration does not match harness",
      })
    );
  }

  if (credential.authMethodId === "api-key" && credential.values.apiKey) {
    return Effect.succeed(
      JSON.stringify({
        auth_mode: "apikey",
        OPENAI_API_KEY: credential.values.apiKey,
      })
    );
  }

  const authJson = credential.values.authJson;

  return authJson
    ? Effect.succeed(authJson)
    : Effect.fail(
        new HarnessUnavailable({
          harness: "codex",
          reason:
            credential.integrationId === "env"
              ? "Codex needs its own credential; an environment credential carries no auth.json"
              : "Credential material is incomplete",
        })
      );
};

export const CodexDriver: HarnessDriverShape = {
  capabilities: {
    commands: true,
    fileChanges: true,
    streaming: true,
    usage: true,
  },
  harness: "codex",
  prepare: (input) =>
    Effect.gen(function* () {
      const credential = Redacted.value(input.credential);
      const auth = yield* authOf(credential);

      yield* installCodex(input.sandbox, input.version);
      yield* authenticateCodex(input.sandbox, auth, input.home);

      const env: Readonly<Record<string, string>> =
        authModeOf(auth) === "chatgpt" ? { [ACCOUNT_CHOOSES_MODEL]: "1" } : {};

      return env;
    }).pipe(Effect.withSpan("Codex.prepare")),
  run: (request: RunHarness) =>
    Effect.gen(function* () {
      const usage = yield* Ref.make(Option.none<HarnessUsage>());
      const pending = yield* Ref.make(noPending);
      const failure = yield* Ref.make(Option.none<string>());

      const events = harnessLines(
        "codex",
        request.sandbox,
        codexCommand(request),
        request.env
      ).pipe(
        Stream.mapEffect(({ at, line }) =>
          Effect.gen(function* () {
            const decoded = decodeCodexLine(line);

            if (
              Option.isSome(decoded.event) &&
              decoded.event.value._tag === "Finished" &&
              decoded.event.value.reason !== "turn.completed"
            ) {
              yield* Ref.set(failure, Option.some(decoded.event.value.reason));
            }

            if (Option.isSome(decoded.usage)) {
              yield* Ref.set(usage, decoded.usage);
            }

            const timed = timeLine(decoded, at, yield* Ref.get(pending));

            yield* Ref.set(pending, timed.pending);

            return Option.map(timed.event, (event) =>
              event._tag === "Started"
                ? { ...event, model: request.model }
                : event
            );
          })
        ),
        Stream.filterMap((event) => event),
        /* A failed turn names its error in the stream; stderr only says it read stdin. */
        Stream.catchAll((error) =>
          Stream.fromEffect(
            Ref.get(failure).pipe(
              Effect.flatMap((reason) =>
                Effect.fail(
                  Option.match(reason, {
                    onNone: () => error,
                    onSome: (found) =>
                      new HarnessUnavailable({
                        harness: "codex",
                        reason: found,
                      }),
                  })
                )
              )
            )
          )
        )
      );

      return {
        events,
        harness: "codex",
        usage: Ref.get(usage),
        version: request.harnessVersion,
      } satisfies HarnessSessionShape;
    }).pipe(Effect.withSpan("CodexRunner.run")),
};
