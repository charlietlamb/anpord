import { Config, Context, Effect, Layer } from "effect";
import type { HarnessName } from "../domain/cell";

const config = Config.all({
  claude: Config.string("EVAL_CLAUDE_VERSION").pipe(
    Config.withDefault("2.1.241")
  ),
  codex: Config.string("EVAL_CODEX_VERSION").pipe(
    Config.orElse(() => Config.string("EVAL_HARNESS_VERSION")),
    Config.withDefault("0.149.0")
  ),
  cursor: Config.string("EVAL_CURSOR_VERSION").pipe(
    Config.withDefault("2026.08.11-e8db854")
  ),
  fx: Config.string("EVAL_FX_VERSION").pipe(Config.withDefault("v0.0.5")),
  gemini: Config.string("EVAL_GEMINI_VERSION").pipe(
    Config.withDefault("0.56.0")
  ),
  opencode: Config.string("EVAL_OPENCODE_VERSION").pipe(
    Config.withDefault("1.18.21")
  ),
  pi: Config.string("EVAL_PI_VERSION").pipe(Config.withDefault("0.84.2")),
  qwen: Config.string("EVAL_QWEN_VERSION").pipe(Config.withDefault("0.22.0")),
});

export interface HarnessVersionsShape {
  readonly version: (harness: HarnessName) => Effect.Effect<string>;
}

export class HarnessVersions extends Context.Tag(
  "@anpord/eval/HarnessVersions"
)<HarnessVersions, HarnessVersionsShape>() {}

export const HarnessVersionsLive = Layer.effect(
  HarnessVersions,
  Effect.gen(function* () {
    const versions = yield* config;

    return HarnessVersions.of({
      version: (harness: HarnessName) =>
        Effect.succeed(versions[harness]).pipe(
          Effect.withSpan("HarnessVersions.version", {
            attributes: { harness },
          })
        ),
    });
  })
);
