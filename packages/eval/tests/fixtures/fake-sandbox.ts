import { Effect, Stream } from "effect";
import type { ExecChunk, SandboxHandle } from "../../src/ports/sandbox";
import { declinesEverything } from "./declines-everything";

export const fakeSandbox =
  (identity: Pick<SandboxHandle, "home" | "id" | "provider">) =>
  (chunks: readonly ExecChunk[]): SandboxHandle => ({
    exec: () => Stream.fromIterable(chunks),
    ...identity,
    ...declinesEverything,
    writeFile: () => Effect.void,
  });
