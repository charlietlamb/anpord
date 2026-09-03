import { Effect } from "effect";
import type { HarnessDriverShape, RunHarness } from "../../ports/harness";
import { decodeClaudeLine } from "./claude-events";
import { shellQuote } from "./process";
import {
  credentialOf,
  installNpmHarness,
  jsonSession,
  requiredValue,
} from "./support";

const BIN = "~/.local/bin/claude";

export const claudeCommand = (request: RunHarness) =>
  [
    `cd ${shellQuote(request.workspace)}`,
    "&&",
    `${BIN} -p ${shellQuote(request.prompt)}`,
    "--output-format stream-json --verbose",
    `--model ${shellQuote(request.model)}`,
    "--bare --dangerously-skip-permissions",
    "< /dev/null",
  ].join(" ");

export const ClaudeDriver: HarnessDriverShape = {
  capabilities: {
    commands: true,
    fileChanges: true,
    streaming: true,
    usage: true,
  },
  harness: "claude",
  prepare: (input) =>
    Effect.gen(function* () {
      const credential = yield* credentialOf(input, "claude");
      const apiKey = yield* requiredValue(credential, "claude", "apiKey");
      yield* installNpmHarness(
        input,
        "claude",
        "@anthropic-ai/claude-code",
        true
      );
      /* Claude Code refuses to skip permissions as root unless told it is in
         a sandbox, and some providers run every command as root. It is in a
         sandbox: that is the whole arrangement. */
      return { ANTHROPIC_API_KEY: apiKey, IS_SANDBOX: "1" };
    }).pipe(Effect.withSpan("Claude.prepare")),
  run: (request) =>
    jsonSession(request, claudeCommand(request), decodeClaudeLine, true).pipe(
      Effect.withSpan("Claude.run")
    ),
};
