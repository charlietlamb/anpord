import type { CredentialValues } from "@anpord/schema/domain/credentials";
import {
  Context,
  type Effect,
  type Option,
  type Redacted,
  type Scope,
  type Stream,
} from "effect";
import type { ProviderName } from "../domain/cell";
import type { SandboxUnavailable } from "../domain/errors";

export type ExecChunk =
  | { readonly at: number; readonly stream: "stdout"; readonly data: string }
  | { readonly at: number; readonly stream: "stderr"; readonly data: string }
  | { readonly at: number; readonly stream: "exit"; readonly exitCode: number };

export interface ExecOptions {
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}

export interface OpenSandbox {
  readonly autoStopMinutes: number;
  /** Names the store this sandbox's prepare should share with the next one
   * preparing the same way. Absent asks for none. */
  readonly cache?: string;
  readonly credentials?: Redacted.Redacted<CredentialValues>;
  readonly provider: ProviderName;
  readonly workspace: string;
}

interface StartedCommand {
  readonly id: string;
  readonly session: string;
}

export interface CommandProgress {
  readonly exitCode: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

/**
 * Somewhere a prepare can leave what it built for the next run preparing the
 * same way.
 *
 * Whole directories in and out rather than a path to work in, because a
 * provider is free to back this with object storage, and object storage does
 * not do the renames and hard links an install performs constantly. A provider
 * that cannot offer this at all offers none, and a prepare is handed nothing.
 *
 * Write-once, as every CI cache is: a key that holds an entry keeps it. That
 * is what makes two sandboxes preparing at once safe without a lock, given
 * neither can rename a finished file into place.
 */
export interface SandboxCache {
  readonly has: (key: string) => Effect.Effect<boolean, SandboxUnavailable>;
  /** False when nothing was stored, when a save did not finish, or when what
   * is there no longer matches what was written. Never a partial restore. */
  readonly restore: (
    key: string,
    path: string
  ) => Effect.Effect<boolean, SandboxUnavailable>;
  readonly save: (
    key: string,
    path: string
  ) => Effect.Effect<void, SandboxUnavailable>;
}

/**
 * Starting a command that outlives the call which asked for it.
 *
 * Offered as a pair, because either alone is useless: a start nobody can poll
 * leaves a command running that nothing will ever collect.
 */
export interface ResumableCommands {
  readonly progress: (
    started: StartedCommand
  ) => Effect.Effect<CommandProgress, SandboxUnavailable>;
  readonly start: (
    command: string,
    options?: ExecOptions
  ) => Effect.Effect<StartedCommand, SandboxUnavailable>;
}

/**
 * A running sandbox, and what it can do beyond running one command.
 *
 * Capabilities are `Option`: a provider declares one by supplying the thing
 * itself and declines it by supplying nothing. So a provider cannot claim a
 * capability it does not have, and a caller cannot reach for one without
 * first asking whether it is there.
 */
export interface SandboxHandle {
  /** None when the provider has nowhere to keep one, or none was asked for. */
  readonly cache: Option.Option<SandboxCache>;
  readonly exec: (
    command: string,
    options?: ExecOptions
  ) => Stream.Stream<ExecChunk, SandboxUnavailable>;
  readonly home: string;
  readonly id: string;
  readonly provider: ProviderName;
  /** None when a command dies with the call that started it. */
  readonly resumable: Option.Option<ResumableCommands>;
  readonly writeFile: (
    path: string,
    content: string
  ) => Effect.Effect<void, SandboxUnavailable>;
}

export interface DestroySandbox {
  readonly credentials?: Redacted.Redacted<CredentialValues>;
  readonly id: string;
  readonly provider: ProviderName;
}

export interface SandboxProviderShape {
  readonly attach: (
    provider: ProviderName,
    id: string
  ) => Effect.Effect<SandboxHandle, SandboxUnavailable, Scope.Scope>;
  readonly destroy: (
    input: DestroySandbox
  ) => Effect.Effect<void, SandboxUnavailable>;
  readonly open: (
    request: OpenSandbox
  ) => Effect.Effect<SandboxHandle, SandboxUnavailable, Scope.Scope>;
}

export class SandboxProvider extends Context.Tag(
  "@anpord/eval/SandboxProvider"
)<SandboxProvider, SandboxProviderShape>() {}

export interface SandboxAdapterShape {
  readonly attach: (
    id: string
  ) => Effect.Effect<SandboxHandle, SandboxUnavailable>;
  readonly destroy: (
    handle: Pick<SandboxHandle, "id">
  ) => Effect.Effect<void, SandboxUnavailable>;
  readonly open: (
    request: OpenSandbox
  ) => Effect.Effect<SandboxHandle, SandboxUnavailable>;
  readonly provider: ProviderName;
}

export class SandboxAdapters extends Context.Tag(
  "@anpord/eval/SandboxAdapters"
)<
  SandboxAdapters,
  {
    readonly resolve: (
      provider: ProviderName,
      credentials?: Redacted.Redacted<CredentialValues>
    ) => Effect.Effect<SandboxAdapterShape>;
  }
>() {}
