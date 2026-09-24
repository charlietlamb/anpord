import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import { Either, Option } from "effect";
import type { RunHarness } from "../../ports/harness";
import { binPath } from "./install";
import { field } from "./json-driver";
import { shellQuote } from "./process";

const BIN = binPath("claude");

const shipped = (request: RunHarness, path: string) =>
  Option.match(request.profile, {
    onNone: () => false,
    onSome: (profile) => Object.hasOwn(profile.files, `workspace/${path}`),
  });

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
    ...Option.match(request.resume, {
      onNone: (): string[] => [],
      onSome: (session) => [`--resume ${shellQuote(session)}`],
    }),
    "--output-format stream-json --verbose",
    `--model ${shellQuote(request.model)}`,
    "--bare --dangerously-skip-permissions",
    ...profileFlags(request),
    "< /dev/null",
  ].join(" ");

export const claudeMaterial = (credential: ResolvedCredential) =>
  Either.map(
    field(
      credential,
      credential.integrationId === "env" ? "ANTHROPIC_API_KEY" : "apiKey"
    ),
    (apiKey) => ({ env: { ANTHROPIC_API_KEY: apiKey, IS_SANDBOX: "1" } })
  );
