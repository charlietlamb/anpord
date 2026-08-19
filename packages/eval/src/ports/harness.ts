import {
  Context,
  type Effect,
  type Option,
  Schema,
  type Scope,
  type Stream,
} from "effect";
import type { HarnessName } from "../domain/cell";
import type { HarnessUnavailable } from "../domain/errors";
import type { SandboxHandle } from "./sandbox";

/** The normalised event both harnesses decode into. Neither harness's own
 * vocabulary escapes its adapter, because scoring each by its own instrument
 * would measure two different things: Codex records exit codes and Claude Code
 * does not. */
export const HarnessEvent = Schema.Union(
  Schema.Struct({
    _tag: Schema.Literal("Started"),
    model: Schema.String,
    sessionId: Schema.String,
  }),
  Schema.Struct({
    _tag: Schema.Literal("Message"),
    role: Schema.Literal("assistant", "user"),
    text: Schema.String,
  }),
  /* A command the agent ran, with the exit code captured where it still
     exists. This is the column an eval platform reading a tool-call string
     cannot have, and the reason the journal is the instrument rather than the
     harness's own account of itself. */
  Schema.Struct({
    _tag: Schema.Literal("Command"),
    command: Schema.String,
    exitCode: Schema.NullOr(Schema.Int),
    output: Schema.String,
  }),
  Schema.Struct({
    _tag: Schema.Literal("FileChange"),
    paths: Schema.Array(Schema.String),
  }),
  Schema.Struct({
    _tag: Schema.Literal("Finished"),
    reason: Schema.String,
  })
);
export type HarnessEvent = typeof HarnessEvent.Type;

/** Token counts a harness reports about itself. Kept as an Option because a
 * harness may not report any, and stored as harness-reported rather than
 * measured: it is an estimate produced by the code under test. */
export const HarnessUsage = Schema.Struct({
  inputTokens: Schema.Int,
  outputTokens: Schema.Int,
  totalTokens: Schema.Int,
});
export type HarnessUsage = typeof HarnessUsage.Type;

export interface RunHarness {
  readonly harness: HarnessName;
  readonly model: string;
  readonly prompt: string;
  readonly sandbox: SandboxHandle;
  readonly workspace: string;
}

export interface HarnessSessionShape {
  readonly events: Stream.Stream<HarnessEvent, HarnessUnavailable>;
  readonly harness: HarnessName;
  readonly usage: Effect.Effect<Option.Option<HarnessUsage>>;
  readonly version: string;
}

export interface HarnessRunnerShape {
  readonly run: (
    request: RunHarness
  ) => Effect.Effect<HarnessSessionShape, HarnessUnavailable, Scope.Scope>;
}

export class HarnessRunner extends Context.Tag("@anpord/eval/HarnessRunner")<
  HarnessRunner,
  HarnessRunnerShape
>() {}
