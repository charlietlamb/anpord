import { Effect, Layer } from "effect";
import type { HarnessName } from "../../domain/cell";
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

/* Total, so adding a harness to the wire union does not compile until it has
   a driver. The unavailable branch below is for a name that reached us from
   a stored row rather than from the union. */
const BY_NAME: Record<HarnessName, HarnessDriverShape> = {
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
    /* Every name in the union has a driver above, and a name read from a
       stored row is decoded before it reaches here, so there is nothing left
       to fail on. */
    resolve: (harness) =>
      Effect.succeed(BY_NAME[harness]).pipe(
        Effect.withSpan("Harnesses.resolve", { attributes: { harness } })
      ),
  })
);
