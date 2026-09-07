import { describe, expect, it } from "bun:test";
import { Effect, Option, Stream } from "effect";
import { readRotatedAuth } from "../../src/adapters/harness/codex-rotation";
import type { ExecChunk, SandboxHandle } from "../../src/ports/sandbox";

const AUTH = JSON.stringify({
  auth_mode: "chatgpt",
  tokens: { access_token: "a", refresh_token: "r" },
});

const sandboxEmitting = (stdout: string, exitCode = 0) =>
  ({
    exec: () =>
      Stream.fromIterable([
        { data: stdout, stream: "stdout" },
        { exitCode, stream: "exit" },
      ] as ExecChunk[]),
  }) as unknown as SandboxHandle;

const read = (stdout: string, exitCode = 0) =>
  Effect.runPromise(
    readRotatedAuth(sandboxEmitting(stdout, exitCode), "/home")
  );

const encoded = (text: string) => Buffer.from(text).toString("base64");

describe("reading the auth file a harness rotated", () => {
  it("returns the file when the read was whole", async () => {
    expect(await read(encoded(AUTH))).toEqual(Option.some(AUTH));
  });

  /* Command output is captured as a bounded tail, so a long file comes back
     clipped. base64 makes that a decode failure rather than a valid-looking
     prefix that would overwrite a good credential with a broken one. */
  it("rejects a clipped read rather than storing a partial file", async () => {
    const clipped = encoded(AUTH).slice(40);

    expect(await read(clipped)).toEqual(Option.none());
  });

  it("rejects a file carrying no refresh token", async () => {
    expect(await read(encoded('{"auth_mode":"apikey"}'))).toEqual(
      Option.none()
    );
  });

  it("returns nothing when the file is absent", async () => {
    expect(await read("", 1)).toEqual(Option.none());
  });
});
