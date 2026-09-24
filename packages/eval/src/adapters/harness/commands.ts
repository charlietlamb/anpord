import { Option } from "effect";
import type { RunHarness } from "../../ports/harness";
import { binPath } from "./install";
import { instructionsPrefix } from "./instructions-file";
import { shellQuote } from "./process";

export const QWEN_BASE_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1";

const inWorkspace = (request: RunHarness, ...parts: readonly string[]) =>
  [
    `${instructionsPrefix(request)}cd ${shellQuote(request.workspace)}`,
    ...parts,
    "< /dev/null",
  ].join(" ");

const model = (request: RunHarness) => `--model ${shellQuote(request.model)}`;

export const geminiCommand = (request: RunHarness) =>
  inWorkspace(
    request,
    "&&",
    `${binPath("gemini")} -p ${shellQuote(request.prompt)}`,
    "--output-format stream-json --yolo",
    model(request)
  );

export const qwenCommand = (request: RunHarness) =>
  inWorkspace(
    request,
    "&&",
    `${binPath("qwen")} -p ${shellQuote(request.prompt)}`,
    "--output-format stream-json --yolo",
    `--auth-type openai --openai-base-url ${shellQuote(request.env.OPENAI_BASE_URL ?? QWEN_BASE_URL)}`,
    model(request)
  );

export const piCommand = (request: RunHarness) =>
  inWorkspace(
    request,
    "&&",
    `${binPath("pi")} --mode json --no-session --approve`,
    model(request),
    shellQuote(request.prompt)
  );

const shipsMcp = (request: RunHarness) =>
  Option.exists(request.profile, ({ files }) =>
    Object.hasOwn(files, "workspace/.cursor/mcp.json")
  );

export const cursorCommand = (request: RunHarness) =>
  inWorkspace(
    request,
    "&&",
    `${binPath("cursor-agent")} -p --force --output-format stream-json`,
    ...(shipsMcp(request) ? ["--approve-mcps"] : []),
    model(request),
    shellQuote(request.prompt)
  );

export const fxCommand = (request: RunHarness) =>
  inWorkspace(
    request,
    "&& mkdir -p ~/.fx",
    `&& printf %s ${shellQuote(JSON.stringify({ model: request.model }))} > ~/.fx/settings.json`,
    "&&",
    `${binPath("fx")} ask --json --yolo --no-color -- ${shellQuote(request.prompt)}`
  );
