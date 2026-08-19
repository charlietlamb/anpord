import {
  Context,
  type Effect,
  type Option,
  type Scope,
  type Stream,
} from "effect";
import type { HarnessName } from "../domain/cell";
import type { HarnessUnavailable } from "../domain/errors";
import type { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import type { SandboxHandle } from "./sandbox";

export interface RunHarness {
  readonly harness: HarnessName;
  /** Pinned, because the cell key carries it: an unpinned install silently
   * compares two different harnesses a month apart. */
  readonly harnessVersion: string;
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
