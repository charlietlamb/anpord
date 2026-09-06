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

/* Write-once whole directories, so concurrent prepares need no lock and a
   provider may back it with object storage. */
export interface SandboxCache {
  readonly has: (key: string) => Effect.Effect<boolean, SandboxUnavailable>;
  /* False on a missing, unfinished, or mismatched entry; never a partial restore. */
  readonly restore: (
    key: string,
    path: string
  ) => Effect.Effect<boolean, SandboxUnavailable>;
  readonly save: (
    key: string,
    path: string
  ) => Effect.Effect<void, SandboxUnavailable>;
}

/* A command outliving the call that started it; paired because a start nobody
   can poll leaves a command nothing will collect. */
export interface ResumableCommands {
  readonly progress: (
    started: StartedCommand
  ) => Effect.Effect<CommandProgress, SandboxUnavailable>;
  readonly start: (
    command: string,
    options?: ExecOptions
  ) => Effect.Effect<StartedCommand, SandboxUnavailable>;
}

/* Capabilities are `Option` so a provider cannot claim one it does not supply. */
export interface SandboxHandle {
  readonly cache: Option.Option<SandboxCache>;
  readonly exec: (
    command: string,
    options?: ExecOptions
  ) => Stream.Stream<ExecChunk, SandboxUnavailable>;
  readonly home: string;
  readonly id: string;
  readonly provider: ProviderName;
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
