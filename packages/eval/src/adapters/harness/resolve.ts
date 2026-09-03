import { Effect, Layer } from "effect";
import type { HarnessName } from "../../domain/cell";
import { HarnessUnavailable } from "../../domain/errors";
import { type HarnessDriverShape, Harnesses } from "../../ports/harness";
import { ClaudeDriver } from "./claude";
import { CodexDriver } from "./codex";
import { CommandDriver } from "./command";
import { CursorDriver } from "./cursor";
import { FxDriver } from "./fx";
import { GeminiDriver } from "./gemini";
import { OpencodeDriver } from "./opencode";
import { PiDriver } from "./pi";
import { QwenDriver } from "./qwen";

/* Partial, so a name the wire accepts before its driver is written resolves
   to HarnessUnavailable rather than failing the build. */
const BY_NAME: Partial<Record<HarnessName, HarnessDriverShape>> = {
  claude: ClaudeDriver,
  codex: CodexDriver,
  command: CommandDriver,
  cursor: CursorDriver,
  fx: FxDriver,
  gemini: GeminiDriver,
  opencode: OpencodeDriver,
  pi: PiDriver,
  qwen: QwenDriver,
};

export const HarnessesLive = Layer.succeed(
  Harnesses,
  Harnesses.of({
    resolve: (harness) => {
      const driver = BY_NAME[harness];

      const resolved =
        driver === undefined
          ? Effect.fail(
              new HarnessUnavailable({
                harness,
                reason: "Harness driver is not registered",
              })
            )
          : Effect.succeed(driver);

      return resolved.pipe(
        Effect.withSpan("Harnesses.resolve", { attributes: { harness } })
      );
    },
  })
);
