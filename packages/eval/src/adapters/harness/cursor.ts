import { Effect, Option } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type {
  HarnessDriverShape,
  PrepareHarness,
  RunHarness,
} from "../../ports/harness";
import { runCommand } from "../sandbox/run-command";
import { decodeClaudeLine } from "./claude-events";
import { instructionsPrefix } from "./instructions-file";
import { shellQuote } from "./process";
import { credentialOf, jsonSession, requiredValue } from "./support";

const BIN = "~/.local/bin/cursor-agent";

const mcpFlags = (request: RunHarness) =>
  Option.match(request.profile, {
    onNone: (): string[] => [],
    onSome: ({ files }) =>
      Object.hasOwn(files, "workspace/.cursor/mcp.json")
        ? ["--approve-mcps"]
        : [],
  });

const install = (input: PrepareHarness) =>
  runCommand(
    input.sandbox,
    [
      `version=${shellQuote(input.version)}`,
      '&& platform=$(case "$(uname -s)-$(uname -m)" in',
      "Linux-x86_64) echo linux/x64;;",
      "Linux-aarch64|Linux-arm64) echo linux/arm64;;",
      "Darwin-x86_64) echo darwin/x64;;",
      "Darwin-arm64) echo darwin/arm64;;",
      "*) exit 64;; esac)",
      "&& mkdir -p ~/.local/bin ~/.local/share/cursor-agent/versions/$version",
      '&& curl -fsSL "https://downloads.cursor.com/lab/$version/$platform/agent-cli-package.tar.gz"',
      "| tar --strip-components=1 -xzf - -C ~/.local/share/cursor-agent/versions/$version",
      "&& ln -sf ~/.local/share/cursor-agent/versions/$version/cursor-agent ~/.local/bin/cursor-agent",
    ].join(" "),
    { timeoutMs: 300_000 }
  ).pipe(
    Effect.mapError(
      (cause) =>
        new HarnessUnavailable({ harness: "cursor", reason: cause.reason })
    ),
    Effect.withSpan("Cursor.install", {
      attributes: { version: input.version },
    })
  );

export const cursorCommand = (request: RunHarness) =>
  [
    `${instructionsPrefix(request)}cd ${shellQuote(request.workspace)}`,
    "&&",
    `${BIN} -p --force --output-format stream-json`,
    ...mcpFlags(request),
    `--model ${shellQuote(request.model)}`,
    shellQuote(request.prompt),
    "< /dev/null",
  ].join(" ");

export const CursorDriver: HarnessDriverShape = {
  harness: "cursor",
  prepare: (input) =>
    Effect.gen(function* () {
      const credential = yield* credentialOf(input, "cursor");
      const apiKey = yield* requiredValue(credential, "cursor", "apiKey");
      yield* install(input);
      return { CURSOR_API_KEY: apiKey };
    }).pipe(Effect.withSpan("Cursor.prepare")),
  run: (request) =>
    jsonSession(request, cursorCommand(request), decodeClaudeLine).pipe(
      Effect.withSpan("Cursor.run")
    ),
};
