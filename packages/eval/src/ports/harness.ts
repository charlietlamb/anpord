import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import type { HarnessCapabilities } from "@anpord/schema/domain/evals";
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
import type { SandboxHandle } from "./sandbox";

export interface RunHarness {
  readonly env: Readonly<Record<string, string>>;
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly model: string;
  readonly prompt: string;
  readonly sandbox: SandboxHandle;
  readonly workspace: string;
}

export interface PrepareHarness {
  readonly credential: Redacted.Redacted<ResolvedCredential>;
  readonly home: string;
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
  readonly capabilities: HarnessCapabilities;
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
