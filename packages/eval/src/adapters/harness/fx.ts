import { Effect } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type {
  HarnessDriverShape,
  PrepareHarness,
  RunHarness,
} from "../../ports/harness";
import { runCommand } from "../sandbox/run-command";
import { decodeFxLine } from "./fx-events";
import { instructionsPrefix } from "./instructions-file";
import { shellQuote } from "./process";
import {
  credentialOf,
  jsonSession,
  requiredValue,
  writeHarnessFile,
} from "./support";

const BIN = "~/.local/bin/fx";

const install = (input: PrepareHarness) =>
  runCommand(
    input.sandbox,
    [
      `version=${shellQuote(input.version)}`,
      '&& platform=$(case "$(uname -s)-$(uname -m)" in',
      "Linux-x86_64) echo linux-x86_64;;",
      "Linux-aarch64|Linux-arm64) echo linux-aarch64;;",
      "Darwin-x86_64) echo macos-x86_64;;",
      "Darwin-arm64) echo macos-aarch64;;",
      "*) exit 64;; esac)",
      "&& mkdir -p ~/.local/bin",
      '&& curl -fsSL "https://releases.fx.sh/$version/fx-$platform.tar.gz"',
      "| tar -xz -C ~/.local/bin",
    ].join(" "),
    { timeoutMs: 300_000 }
  ).pipe(
    Effect.mapError(
      (cause) => new HarnessUnavailable({ harness: "fx", reason: cause.reason })
    ),
    Effect.withSpan("Fx.install", {
      attributes: { version: input.version },
    })
  );

export const fxCommand = (request: RunHarness) =>
  [
    `${instructionsPrefix(request)}cd ${shellQuote(request.workspace)}`,
    "&& mkdir -p ~/.fx",
    `&& printf %s ${shellQuote(JSON.stringify({ model: request.model }))} > ~/.fx/settings.json`,
    "&&",
    `${BIN} ask --json --yolo --no-color -- ${shellQuote(request.prompt)}`,
    "< /dev/null",
  ].join(" ");

export const FxDriver: HarnessDriverShape = {
  harness: "fx",
  prepare: (input) =>
    Effect.gen(function* () {
      const credential = yield* credentialOf(input, "fx");
      yield* install(input);

      if (credential.authMethodId === "chatgpt-auth") {
        const auth = yield* requiredValue(credential, "fx", "authJson");
        yield* writeHarnessFile(
          input,
          "fx",
          `${input.home}/.fx/chatgpt-auth.json`,
          auth
        );
        return {} as Readonly<Record<string, string>>;
      }

      const apiKey = yield* requiredValue(credential, "fx", "apiKey");
      return { AI_GATEWAY_API_KEY: apiKey };
    }).pipe(Effect.withSpan("Fx.prepare")),
  run: (request) =>
    jsonSession(request, fxCommand(request), decodeFxLine, true).pipe(
      Effect.withSpan("Fx.run")
    ),
};
