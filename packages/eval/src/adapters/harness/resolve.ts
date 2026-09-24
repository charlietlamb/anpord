import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import { Effect, Either, Layer } from "effect";
import type { HarnessName } from "../../domain/variant";
import { type HarnessDriverShape, Harnesses } from "../../ports/harness";
import { claudeCommand, claudeMaterial } from "./claude";
import { decodeClaudeLine } from "./claude-events";
import { captureCodexRotation, codexCommand, codexMaterial } from "./codex";
import { decodeCodexLine } from "./codex-events";
import { CommandDriver } from "./command";
import {
  cursorCommand,
  fxCommand,
  geminiCommand,
  piCommand,
  QWEN_BASE_URL,
  qwenCommand,
} from "./commands";
import { decodeFxLine } from "./fx-events";
import { decodeGeminiLine } from "./gemini-events";
import { npmInstall, releaseInstall, scriptInstall } from "./install";
import { field, jsonDriver, keyAs } from "./json-driver";
import { opencodeCommand, opencodeMaterial, opencodeRunEnv } from "./opencode";
import { decodeOpencodeLine } from "./opencode-events";
import { decodePiLine } from "./pi-events";

const fxMaterial = (credential: ResolvedCredential) =>
  credential.authMethodId === "chatgpt-auth"
    ? Either.map(field(credential, "authJson"), (auth) => ({
        env: {},
        files: { ".fx/chatgpt-auth.json": auth },
      }))
    : keyAs("AI_GATEWAY_API_KEY")(credential);

export const HARNESS_DRIVERS: Record<HarnessName, HarnessDriverShape> = {
  claude: jsonDriver("claude", {
    command: claudeCommand,
    decode: decodeClaudeLine,
    install: npmInstall("@anthropic-ai/claude-code", { scripts: true }),
    material: claudeMaterial,
    verifyModel: true,
  }),
  codex: jsonDriver("codex", {
    captureRotation: captureCodexRotation,
    command: codexCommand,
    decode: decodeCodexLine,
    install: npmInstall("@openai/codex", { scripts: true }),
    material: codexMaterial,
  }),
  command: CommandDriver,
  cursor: jsonDriver("cursor", {
    command: cursorCommand,
    decode: decodeClaudeLine,
    install: releaseInstall(
      {
        darwinArm64: "darwin/arm64",
        darwinX64: "darwin/x64",
        linuxArm64: "linux/arm64",
        linuxX64: "linux/x64",
      },
      [
        "&& mkdir -p ~/.local/bin ~/.local/share/cursor-agent/versions/$version",
        '&& curl -fsSL "https://downloads.cursor.com/lab/$version/$platform/agent-cli-package.tar.gz"',
        "| tar --strip-components=1 -xzf - -C ~/.local/share/cursor-agent/versions/$version",
        "&& ln -sf ~/.local/share/cursor-agent/versions/$version/cursor-agent ~/.local/bin/cursor-agent",
      ]
    ),
    material: keyAs("CURSOR_API_KEY"),
  }),
  fx: jsonDriver("fx", {
    command: fxCommand,
    decode: decodeFxLine,
    install: releaseInstall(
      {
        darwinArm64: "macos-aarch64",
        darwinX64: "macos-x86_64",
        linuxArm64: "linux-aarch64",
        linuxX64: "linux-x86_64",
      },
      [
        "&& mkdir -p ~/.local/bin",
        '&& curl -fsSL "https://releases.fx.sh/$version/fx-$platform.tar.gz"',
        "| tar -xz -C ~/.local/bin",
      ]
    ),
    material: fxMaterial,
    verifyModel: true,
  }),
  gemini: jsonDriver("gemini", {
    command: geminiCommand,
    decode: decodeGeminiLine,
    install: npmInstall("@google/gemini-cli"),
    material: keyAs("GEMINI_API_KEY"),
    verifyModel: true,
  }),
  opencode: jsonDriver("opencode", {
    command: opencodeCommand,
    decode: decodeOpencodeLine,
    install: scriptInstall("https://opencode.ai/install", 120_000),
    material: opencodeMaterial,
    runEnv: opencodeRunEnv,
  }),
  pi: jsonDriver("pi", {
    command: piCommand,
    decode: decodePiLine,
    install: npmInstall("@earendil-works/pi-coding-agent"),
    material: (credential) =>
      Either.map(field(credential, "authJson"), (auth) => ({
        env: { PI_OFFLINE: "1", PI_SKIP_VERSION_CHECK: "1" },
        files: { ".pi/agent/auth.json": auth },
      })),
  }),
  qwen: jsonDriver("qwen", {
    command: qwenCommand,
    decode: decodeClaudeLine,
    install: npmInstall("@qwen-code/qwen-code"),
    material: (credential) =>
      Either.map(field(credential, "apiKey"), (apiKey) => ({
        env: {
          OPENAI_API_KEY: apiKey,
          OPENAI_BASE_URL: credential.values.baseUrl ?? QWEN_BASE_URL,
        },
      })),
    verifyModel: true,
  }),
};

export const HarnessesLive = Layer.succeed(
  Harnesses,
  Harnesses.of({
    resolve: (harness) =>
      Effect.succeed(HARNESS_DRIVERS[harness]).pipe(
        Effect.withSpan("Harnesses.resolve", { attributes: { harness } })
      ),
  })
);
