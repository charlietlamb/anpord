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
      /* Without IS_SANDBOX, Claude Code refuses to skip permissions as root. */
      return { ANTHROPIC_API_KEY: apiKey, IS_SANDBOX: "1" };
    }).pipe(Effect.withSpan("Claude.prepare")),
  run: (request) =>
    jsonSession(request, claudeCommand(request), decodeClaudeLine, true).pipe(
      Effect.withSpan("Claude.run")
    ),
};
