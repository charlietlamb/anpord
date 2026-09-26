import { describe, expect, test } from "bun:test";
import { Effect, Stream } from "effect";
import { runCommand } from "../../src/adapters/sandbox/run-command";
import {
  HarnessUnavailable,
  PrepareFailed,
  SandboxUnavailable,
  SourceUnavailable,
} from "../../src/domain/errors";
import type { SandboxHandle } from "../../src/ports/sandbox";
import { exit, stderr } from "../fixtures/exec-chunk";

const STDERR =
  "fatal: could not read from https://x-access-token:ghs_16C7e42F292c6912E7710c838347Ae178B4a@github.com/acme/app";
const SHOWN =
  "fatal: could not read from https://x-access-token:[redacted]@github.com/acme/app";

describe("an error that carries what a process wrote", () => {
  test.each([
    [
      "SandboxUnavailable",
      new SandboxUnavailable({ provider: "e2b", reason: STDERR }).reason,
    ],
    [
      "HarnessUnavailable",
      new HarnessUnavailable({ harness: "codex", reason: STDERR }).reason,
    ],
    [
      "SourceUnavailable",
      new SourceUnavailable({
        reason: STDERR,
        url: "https://github.com/acme/app",
      }).reason,
    ],
    [
      "PrepareFailed",
      new PrepareFailed({ name: "seed", reason: STDERR }).reason,
    ],
  ])("%s keeps no credential in its reason", (_, reason) => {
    expect(reason).toBe(SHOWN);
  });

  test("a failed command reports its stderr with the token redacted", async () => {
    const failure = await Effect.runPromise(
      Effect.flip(
        runCommand(
          {
            exec: () => Stream.fromIterable([stderr(`${STDERR}\n`), exit(128)]),
            provider: "daytona",
          } as unknown as SandboxHandle,
          "git fetch"
        )
      )
    );

    expect(failure.reason).toBe(`Command exited with status 128: ${SHOWN}`);
  });
});
