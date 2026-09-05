import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import {
  Context,
  type Effect,
  type Option,
  type Redacted,
  type Scope,
  type Stream,
} from "effect";
import type { HarnessName } from "../domain/cell";
import type { HarnessUnavailable } from "../domain/errors";
import type { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import type { RequestedProfile } from "../domain/harness-profile";
import type { SandboxHandle } from "./sandbox";

export interface RunHarness {
  readonly env: Readonly<Record<string, string>>;
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly model: string;
  readonly profile: Option.Option<RequestedProfile>;
  readonly prompt: string;
  readonly sandbox: SandboxHandle;
  /** Where the materialiser left the profile's system prompt, for a base that
   * names a file rather than taking the text. */
  readonly systemPromptPath: Option.Option<string>;
  readonly workspace: string;
}

export interface PrepareHarness {
  readonly credential: Redacted.Redacted<ResolvedCredential>;
  readonly home: string;
  readonly profile: Option.Option<RequestedProfile>;
  readonly sandbox: SandboxHandle;
  readonly version: string;
}

export interface HarnessSessionShape {
  readonly events: Stream.Stream<HarnessEvent, HarnessUnavailable>;
  readonly harness: HarnessName;
  readonly usage: Effect.Effect<Option.Option<HarnessUsage>>;
  readonly version: string;
}

export interface HarnessDriverShape {
  readonly harness: HarnessName;
  readonly prepare: (
    input: PrepareHarness
  ) => Effect.Effect<Readonly<Record<string, string>>, HarnessUnavailable>;
  readonly run: (
    request: RunHarness
  ) => Effect.Effect<HarnessSessionShape, HarnessUnavailable, Scope.Scope>;
}

export class Harnesses extends Context.Tag("@anpord/eval/Harnesses")<
  Harnesses,
  {
    readonly resolve: (
      harness: HarnessName
    ) => Effect.Effect<HarnessDriverShape, HarnessUnavailable>;
  }
>() {}
