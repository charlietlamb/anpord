import type { CredentialValues } from "@anpord/schema/domain/credentials";
import { Effect } from "effect";
import {
  describeFailure,
  type SandboxUnavailable,
  sandboxUnavailable,
} from "../../domain/errors";
import type { SandboxName } from "../../domain/variant";
import type {
  OpenSandbox,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../ports/sandbox";

export const DEFAULT_TIMEOUT_MS = 120_000;

const NAMED = 80;

export type MakeAdapter = (
  values?: CredentialValues
) => Effect.Effect<SandboxAdapterShape>;

export const unavailableFor =
  (provider: SandboxName, during?: string) => (reason: unknown) =>
    sandboxUnavailable(
      provider,
      during === undefined
        ? reason
        : `${during.slice(0, NAMED)}: ${describeFailure(reason)}`
    );

export const providerCall =
  (provider: SandboxName) =>
  <A>(
    run: () => Promise<A>,
    during?: string
  ): Effect.Effect<A, SandboxUnavailable> =>
    Effect.tryPromise({ catch: unavailableFor(provider, during), try: run });

export interface ProviderClient<S> {
  readonly connect: (id: string) => Effect.Effect<S, SandboxUnavailable>;
  readonly create: (
    request: OpenSandbox
  ) => Effect.Effect<S, SandboxUnavailable>;
  readonly destroy: (id: string) => Effect.Effect<unknown, SandboxUnavailable>;
  readonly discard: (sandbox: S) => Effect.Effect<unknown, unknown>;
  readonly handleFor: (
    sandbox: S,
    workspace: string,
    request?: OpenSandbox
  ) => SandboxHandle;
  readonly home: string;
  readonly makeWorkspace: (
    sandbox: S,
    workspace: string
  ) => Effect.Effect<unknown, SandboxUnavailable>;
  readonly provider: SandboxName;
}

export const providerAdapter = <S>(
  client: ProviderClient<S>
): SandboxAdapterShape => ({
  attach: (id) =>
    client
      .connect(id)
      .pipe(Effect.map((sandbox) => client.handleFor(sandbox, client.home))),
  destroy: (handle) => client.destroy(handle.id).pipe(Effect.asVoid),
  open: (request) =>
    client.create(request).pipe(
      Effect.flatMap((sandbox) =>
        client.makeWorkspace(sandbox, request.workspace).pipe(
          Effect.as(client.handleFor(sandbox, request.workspace, request)),
          Effect.tapError(() => Effect.ignore(client.discard(sandbox)))
        )
      )
    ),
  provider: client.provider,
});
