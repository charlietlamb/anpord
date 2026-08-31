import type { CredentialValues } from "@anpord/schema/domain/credentials";
import {
  Context,
  type Effect,
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
  /** A directory that outlives the sandbox, shared by every sandbox naming
   * the same cache. Absent when the provider has nowhere to put one. */
  readonly cache?: string;
  readonly credentials?: Redacted.Redacted<CredentialValues>;
  readonly provider: ProviderName;
  readonly workspace: string;
}

export interface StartedCommand {
  readonly id: string;
  readonly session: string;
}

export interface CommandProgress {
  readonly exitCode: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

export interface SandboxHandle {
  /** Where the cache was mounted, when one was asked for and the provider
   * had somewhere to put it. */
  readonly cache: string | null;
  readonly exec: (
    command: string,
    options?: ExecOptions
  ) => Stream.Stream<ExecChunk, SandboxUnavailable>;
  readonly home: string;
  readonly id: string;
  readonly progress: (
    started: StartedCommand
  ) => Effect.Effect<CommandProgress, SandboxUnavailable>;
  readonly provider: ProviderName;
  readonly start: (
    command: string,
    options?: ExecOptions
  ) => Effect.Effect<StartedCommand, SandboxUnavailable>;
  readonly streaming: boolean;
  readonly writeFile: (
    path: string,
    content: string
  ) => Effect.Effect<void, SandboxUnavailable>;
}

export interface SandboxProviderShape {
  readonly attach: (
    provider: ProviderName,
    id: string
  ) => Effect.Effect<SandboxHandle, SandboxUnavailable, Scope.Scope>;
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
    handle: SandboxHandle
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
