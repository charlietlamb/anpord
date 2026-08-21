import { Chunk, Effect, Stream } from "effect";
import type { HarnessEvent } from "../domain/harness-event";
import type { SandboxHandle } from "../ports/sandbox";
import type { Evidence } from "./define";

/** What a scorer is given, built where the trial ran. */
export const evidenceFrom = (input: {
  readonly events: readonly HarnessEvent[];
  readonly sandbox: SandboxHandle;
}): Evidence => ({
  events: input.events,
  exec: (command: string) =>
    Stream.runCollect(input.sandbox.exec(command)).pipe(
      Effect.map(Chunk.toReadonlyArray),
      Effect.map((chunks) => ({
        /* A stream that ended without an exit chunk never said how it went,
           and reading that as success is the vacuous pass this catches. */
        exitCode:
          chunks.find((chunk) => chunk.stream === "exit")?.exitCode ?? 1,
        output: chunks
          .flatMap((chunk) => (chunk.stream === "exit" ? [] : [chunk.data]))
          .join(""),
      })),
      Effect.withSpan("Evidence.exec", { attributes: { command } })
    ),
});
