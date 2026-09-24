import type { Effect } from "effect";
import type { SandboxUnavailable } from "../../domain/errors";
import type { PrepareHarness } from "../../ports/harness";
import { runCommand } from "../sandbox/run-command";
import { shellQuote } from "./process";

export type Install = (
  input: PrepareHarness
) => Effect.Effect<void, SandboxUnavailable>;

const PREFIX = "~/.local";

const INSTALL_TIMEOUT_MS = 300_000;

export const binPath = (name: string) => `${PREFIX}/bin/${name}`;

export const npmInstall =
  (
    packageName: string,
    options: { readonly scripts?: boolean } = {}
  ): Install =>
  (input) =>
    runCommand(
      input.sandbox,
      [
        `npm i -g --prefix ${PREFIX}`,
        ...(options.scripts ? [] : ["--ignore-scripts"]),
        shellQuote(`${packageName}@${input.version}`),
        ">/dev/null 2>&1",
      ].join(" "),
      { timeoutMs: INSTALL_TIMEOUT_MS }
    );

export interface ReleasePlatforms {
  readonly darwinArm64: string;
  readonly darwinX64: string;
  readonly linuxArm64: string;
  readonly linuxX64: string;
}

export const releaseInstall =
  (platforms: ReleasePlatforms, steps: readonly string[]): Install =>
  (input) =>
    runCommand(
      input.sandbox,
      [
        `version=${shellQuote(input.version)}`,
        '&& platform=$(case "$(uname -s)-$(uname -m)" in',
        `Linux-x86_64) echo ${platforms.linuxX64};;`,
        `Linux-aarch64|Linux-arm64) echo ${platforms.linuxArm64};;`,
        `Darwin-x86_64) echo ${platforms.darwinX64};;`,
        `Darwin-arm64) echo ${platforms.darwinArm64};;`,
        "*) exit 64;; esac)",
        ...steps,
      ].join(" "),
      { timeoutMs: INSTALL_TIMEOUT_MS }
    );

export const scriptInstall =
  (url: string, timeoutMs: number): Install =>
  (input) =>
    runCommand(
      input.sandbox,
      `curl -fsSL ${url} | VERSION=${shellQuote(input.version)} bash >/dev/null 2>&1`,
      { timeoutMs }
    );
