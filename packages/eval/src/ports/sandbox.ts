import { Context, type Effect, type Scope, type Stream } from "effect";
import type { ProviderName } from "../domain/cell";
import type { SandboxUnavailable } from "../domain/errors";

/** A chunk of a running command.
 *
 * `at` is when the chunk was observed, in epoch millis, and it is required.
 * Without it the type let an adapter that returns a whole run in one piece
 * look identical to one that streams, which is how every event in a trial
 * came to share a single timestamp: the harness read the clock when a line
 * arrived, and the transport decided when that was. */
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
  /** Whether output arrives as it is produced.
   *
   * Declared rather than assumed: a provider that answers in one piece gives
   * every chunk the same `at`, and a waterfall drawn from those would show
   * bars of zero width as though the work took no time. False means render
   * the sequence and say the durations are unknown. */
  readonly streaming: boolean;
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
