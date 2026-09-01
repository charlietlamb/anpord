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

export const codexCommand = (request: RunHarness) =>
  [
    `cd ${shellQuote(request.workspace)}`,
    "&&",
    `${CODEX_BIN} exec --json --skip-git-repo-check`,
    "--dangerously-bypass-approvals-and-sandbox",
    /* Omitted rather than empty when there is none: a ChatGPT subscription
       chooses its own model and refuses any name, so the flag itself is what
       has to go. */
    ...(request.model === "" ? [] : [`--model ${shellQuote(request.model)}`]),
    shellQuote(request.prompt),
    "< /dev/null",
  ].join(" ");

const authOf = (credential: ResolvedCredential) => {
  if (credential.integrationId !== "codex") {
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
          reason: "Credential material is incomplete",
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

      return {};
    }).pipe(Effect.withSpan("Codex.prepare")),
  run: (request: RunHarness) =>
    Effect.gen(function* () {
      const usage = yield* Ref.make(Option.none<HarnessUsage>());
      const pending = yield* Ref.make(noPending);

      const events = harnessLines(
        "codex",
        request.sandbox,
        codexCommand(request),
        request.env
      ).pipe(
        Stream.mapEffect(({ at, line }) =>
          Effect.gen(function* () {
            const decoded = decodeCodexLine(line);

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
        Stream.filterMap((event) => event)
      );

      return {
        events,
        harness: "codex",
        usage: Ref.get(usage),
        version: request.harnessVersion,
      } satisfies HarnessSessionShape;
    }).pipe(Effect.withSpan("CodexRunner.run")),
};
