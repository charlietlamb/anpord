import { Effect } from "effect";
import type { HarnessDriverShape, RunHarness } from "../../ports/harness";
import { decodeGeminiLine } from "./gemini-events";
import { instructionsPrefix } from "./instructions-file";
import { shellQuote } from "./process";
import {
  credentialOf,
  installNpmHarness,
  jsonSession,
  requiredValue,
} from "./support";

const BIN = "~/.local/bin/gemini";

export const geminiCommand = (request: RunHarness) =>
  [
    `${instructionsPrefix(request)}cd ${shellQuote(request.workspace)}`,
    "&&",
    `${BIN} -p ${shellQuote(request.prompt)}`,
    "--output-format stream-json --yolo",
    `--model ${shellQuote(request.model)}`,
    "< /dev/null",
  ].join(" ");

export const GeminiDriver: HarnessDriverShape = {
  harness: "gemini",
  prepare: (input) =>
    Effect.gen(function* () {
      const credential = yield* credentialOf(input, "gemini");
      const apiKey = yield* requiredValue(credential, "gemini", "apiKey");
      yield* installNpmHarness(input, "gemini", "@google/gemini-cli");
      return { GEMINI_API_KEY: apiKey };
    }).pipe(Effect.withSpan("Gemini.prepare")),
  run: (request) =>
    jsonSession(request, geminiCommand(request), decodeGeminiLine, true).pipe(
      Effect.withSpan("Gemini.run")
    ),
};
