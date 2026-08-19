import { Context, type Effect, type Scope, type Stream } from "effect";
import type { ProviderName } from "../domain/cell";
import type { SandboxUnavailable } from "../domain/errors";

/**
 * A chunk of a running command, following the shape a docs tool uses in
 * production. The exit code arrives *in* the stream rather than after it,
 * which is what lets a live view show a command finishing and what keeps the
 * journal's exit codes captured at the call site where they still exist.
 */
export type ExecChunk =
  | { readonly stream: "stdout"; readonly data: string }
  | { readonly stream: "stderr"; readonly data: string }
  | { readonly stream: "exit"; readonly exitCode: number };

export interface ExecOptions {
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}

export interface OpenSandbox {
  /** Bounds the bill whatever happens to our process. Compensation does not
   * run when a workflow is interrupted rather than failed, so a provider-side
   * stop is the only guarantee that survives a killed worker. */
  readonly autoStopMinutes: number;
  readonly provider: ProviderName;
  readonly workspace: string;
}

export interface SandboxHandle {
  readonly exec: (
    command: string,
    options?: ExecOptions
  ) => Stream.Stream<ExecChunk, SandboxUnavailable>;
  readonly id: string;
  readonly provider: ProviderName;
  readonly writeFile: (
    path: string,
    content: string
  ) => Effect.Effect<void, SandboxUnavailable>;
}

export interface SandboxProviderShape {
  /** Reattach to a sandbox that outlived the process which made it, which a
   * resumed workflow needs and which providers do support. */
  readonly attach: (
    provider: ProviderName,
    id: string
  ) => Effect.Effect<SandboxHandle, SandboxUnavailable, Scope.Scope>;
  /** Scoped, so a caller cannot obtain a sandbox without saying who closes it
   * and a leak becomes a type error rather than a bill. */
  readonly open: (
    request: OpenSandbox
  ) => Effect.Effect<SandboxHandle, SandboxUnavailable, Scope.Scope>;
}

export class SandboxProvider extends Context.Tag(
  "@anpord/eval/SandboxProvider"
)<SandboxProvider, SandboxProviderShape>() {}

/** One adapter per vendor. Adding Modal is a new file and one line in the
 * resolver, never an edit to anything above. */
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
      provider: ProviderName
    ) => Effect.Effect<SandboxAdapterShape>;
  }
>() {}
