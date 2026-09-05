import { Effect } from "effect";
import type { HarnessDriverShape, RunHarness } from "../../ports/harness";
import { decodeClaudeLine } from "./claude-events";
import { instructionsPrefix } from "./instructions-file";
import { shellQuote } from "./process";
import {
  credentialOf,
  installNpmHarness,
  jsonSession,
  requiredValue,
} from "./support";

const BIN = "~/.local/bin/qwen";
const BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

export const qwenCommand = (request: RunHarness) =>
  [
    `${instructionsPrefix(request)}cd ${shellQuote(request.workspace)}`,
    "&&",
    `${BIN} -p ${shellQuote(request.prompt)}`,
    "--output-format stream-json --yolo",
    `--auth-type openai --openai-base-url ${shellQuote(request.env.OPENAI_BASE_URL ?? BASE_URL)}`,
    `--model ${shellQuote(request.model)}`,
    "< /dev/null",
  ].join(" ");

export const QwenDriver: HarnessDriverShape = {
  harness: "qwen",
  prepare: (input) =>
    Effect.gen(function* () {
      const credential = yield* credentialOf(input, "qwen");
      const apiKey = yield* requiredValue(credential, "qwen", "apiKey");
      yield* installNpmHarness(input, "qwen", "@qwen-code/qwen-code");
      return {
        OPENAI_API_KEY: apiKey,
        OPENAI_BASE_URL: credential.values.baseUrl ?? BASE_URL,
      };
    }).pipe(Effect.withSpan("Qwen.prepare")),
  run: (request) =>
    jsonSession(request, qwenCommand(request), decodeClaudeLine, true).pipe(
      Effect.withSpan("Qwen.run")
    ),
};
