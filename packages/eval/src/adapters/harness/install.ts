import { type Effect, Option } from "effect";
import type { SandboxUnavailable } from "../../domain/errors";
import type { HarnessName } from "../../domain/variant";
import type { PrepareHarness, RunHarness } from "../../ports/harness";
import { runCommand } from "../sandbox/run-command";
import { shellQuote } from "./process";

interface Install {
  readonly command: string;
  readonly timeoutMs: number;
}

export type InstallPlan = (version: string) => Install;

const INSTALL_TIMEOUT_MS = 300_000;

const installKey = (harness: HarnessName, version: string) =>
  `${harness}@${version}`;

type Installed = Pick<RunHarness, "harness" | "harnessVersion" | "sandbox">;

export const installedPath = (request: Installed, path: string) => {
  const home = Option.match(request.sandbox.installs, {
    onNone: () => "~",
    onSome: (installs) =>
      shellQuote(
        installs.homeFor(installKey(request.harness, request.harnessVersion))
      ),
  });

  return `${home}/${path}`;
};

export const binPath = (request: Installed, name: string) =>
  installedPath(request, `.local/bin/${name}`);

export const installHarness = (
  harness: HarnessName,
  plan: InstallPlan,
  input: PrepareHarness
): Effect.Effect<void, SandboxUnavailable> => {
  const { command, timeoutMs } = plan(input.version);

  return Option.match(input.sandbox.installs, {
    onNone: () => runCommand(input.sandbox, command, { timeoutMs }),
    onSome: (installs) =>
      installs.ensure(installKey(harness, input.version), (home) =>
        runCommand(input.sandbox, command, { env: { HOME: home }, timeoutMs })
      ),
  });
};

const NPM_CACHE = "~/.anpord-npm-cache";

export const npmInstall =
  (
    packageName: string,
    options: { readonly scripts?: boolean } = {}
  ): InstallPlan =>
  (version) => ({
    command: [
      `npm i -g --prefix ~/.local --cache ${NPM_CACHE}`,
      ...(options.scripts ? [] : ["--ignore-scripts"]),
      shellQuote(`${packageName}@${version}`),
      `>/dev/null && rm -rf ${NPM_CACHE}`,
    ].join(" "),
    timeoutMs: INSTALL_TIMEOUT_MS,
  });

export interface ReleasePlatforms {
  readonly darwinArm64: string;
  readonly darwinX64: string;
  readonly linuxArm64: string;
  readonly linuxX64: string;
}

export const releaseInstall =
  (platforms: ReleasePlatforms, steps: readonly string[]): InstallPlan =>
  (version) => ({
    command: [
      `version=${shellQuote(version)}`,
      '&& platform=$(case "$(uname -s)-$(uname -m)" in',
      `Linux-x86_64) echo ${platforms.linuxX64};;`,
      `Linux-aarch64|Linux-arm64) echo ${platforms.linuxArm64};;`,
      `Darwin-x86_64) echo ${platforms.darwinX64};;`,
      `Darwin-arm64) echo ${platforms.darwinArm64};;`,
      '*) echo "no release for $(uname -s)-$(uname -m)" >&2; exit 64;; esac)',
      ...steps,
    ].join(" "),
    timeoutMs: INSTALL_TIMEOUT_MS,
  });

export const scriptInstall =
  (url: string, timeoutMs: number): InstallPlan =>
  (version) => ({
    command: `curl -fsSL ${url} | VERSION=${shellQuote(version)} bash >/dev/null`,
    timeoutMs,
  });
