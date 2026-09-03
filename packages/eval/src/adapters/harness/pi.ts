import { Effect } from "effect";
import type { HarnessDriverShape, RunHarness } from "../../ports/harness";
import { instructionsPrefix } from "./instructions-file";
import { decodePiLine } from "./pi-events";
import { shellQuote } from "./process";
import {
  credentialOf,
  installNpmHarness,
  jsonSession,
  requiredValue,
  writeHarnessFile,
} from "./support";

const BIN = "~/.local/bin/pi";

export const piCommand = (request: RunHarness) =>
  [
    `${instructionsPrefix(request)}cd ${shellQuote(request.workspace)}`,
    "&&",
    `${BIN} --mode json --no-session --approve`,
    `--model ${shellQuote(request.model)}`,
    shellQuote(request.prompt),
    "< /dev/null",
  ].join(" ");

export const PiDriver: HarnessDriverShape = {
  capabilities: {
    commands: true,
    fileChanges: true,
    streaming: true,
    usage: true,
  },
  harness: "pi",
  prepare: (input) =>
    Effect.gen(function* () {
      const credential = yield* credentialOf(input, "pi");
      const auth = yield* requiredValue(credential, "pi", "authJson");

      yield* installNpmHarness(input, "pi", "@earendil-works/pi-coding-agent");
      yield* writeHarnessFile(
        input,
        "pi",
        `${input.home}/.pi/agent/auth.json`,
        auth
      );

      return { PI_OFFLINE: "1", PI_SKIP_VERSION_CHECK: "1" };
    }).pipe(Effect.withSpan("Pi.prepare")),
  run: (request) =>
    jsonSession(request, piCommand(request), decodePiLine).pipe(
      Effect.withSpan("Pi.run")
    ),
};
