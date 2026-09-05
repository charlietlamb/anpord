import { Effect, Option } from "effect";
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

const shipped = (request: RunHarness, path: string) =>
  Option.match(request.profile, {
    onNone: () => false,
    onSome: (profile) => Object.hasOwn(profile.files, `workspace/${path}`),
  });

/* --bare turns off CLAUDE.md auto-discovery, so a profile's workspace files
   are read only when the directory and each config file are named. */
const profileFlags = (request: RunHarness) => {
  if (Option.isNone(request.profile)) {
    return [];
  }

  const workspace = shellQuote(request.workspace);

  return [
    `--add-dir ${workspace}`,
    ...Option.match(request.systemPromptPath, {
      onNone: (): string[] => [],
      onSome: (path) => [`--append-system-prompt-file ${shellQuote(path)}`],
    }),
    ...(shipped(request, ".claude/settings.json")
      ? [
          `--settings ${shellQuote(`${request.workspace}/.claude/settings.json`)}`,
        ]
      : []),
    ...(shipped(request, ".mcp.json")
      ? [`--mcp-config ${shellQuote(`${request.workspace}/.mcp.json`)}`]
      : []),
  ];
};

export const claudeCommand = (request: RunHarness) =>
  [
    `cd ${shellQuote(request.workspace)}`,
    "&&",
    `${BIN} -p ${shellQuote(request.prompt)}`,
    "--output-format stream-json --verbose",
    `--model ${shellQuote(request.model)}`,
    "--bare --dangerously-skip-permissions",
    ...profileFlags(request),
    "< /dev/null",
  ].join(" ");

export const ClaudeDriver: HarnessDriverShape = {
  harness: "claude",
  prepare: (input) =>
    Effect.gen(function* () {
      const credential = yield* credentialOf(input, "claude");
      const apiKey = yield* requiredValue(
        credential,
        "claude",
        credential.integrationId === "env" ? "ANTHROPIC_API_KEY" : "apiKey"
      );
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
