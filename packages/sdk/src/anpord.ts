import { FetchHttpClient } from "@effect/platform";
import { Cause, Effect, Exit, Option, Redacted } from "effect";
import { type AnpordClient, DEFAULT_BASE_URL, make } from "./client";
import { asAnpordError, MissingApiKey } from "./errors";

export interface AnpordOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
}

type Payload<Method> = Method extends (request: {
  readonly payload: infer P;
}) => unknown
  ? P
  : never;

type Result<Method> = Method extends (
  request: never
) => Effect.Effect<infer A, unknown, never>
  ? A
  : never;

type Promised<Group> = {
  readonly [Method in keyof Group]: Payload<Group[Method]> extends
    | Record<string, never>
    | undefined
    ? (request?: Payload<Group[Method]>) => Promise<Result<Group[Method]>>
    : (request: Payload<Group[Method]>) => Promise<Result<Group[Method]>>;
};

const resolveApiKey = (provided: string | undefined) => {
  const apiKey = provided ?? globalThis.process?.env?.ANPORD_API_KEY;
  if (!apiKey) {
    throw new MissingApiKey();
  }
  return apiKey;
};

export class Anpord {
  readonly prompts: Promised<AnpordClient["prompts"]>;

  constructor(options: AnpordOptions = {}) {
    const apiKey = resolveApiKey(options.apiKey);
    const client = make({
      apiKey: Redacted.make(apiKey),
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.runSync);

    this.prompts = promised(client.prompts);
  }
}

const promised = <Group extends Record<string, unknown>>(group: Group) =>
  Object.fromEntries(
    Object.entries(group).map(([method, run]) => [
      method,
      async (request: unknown) => {
        const exit = await Effect.runPromiseExit(
          (run as (input: unknown) => Effect.Effect<unknown, unknown, never>)({
            payload: request ?? {},
          })
        );
        if (Exit.isSuccess(exit)) {
          return exit.value;
        }
        throw asAnpordError(
          Cause.failureOption(exit.cause).pipe(
            Option.getOrElse(() => Cause.squash(exit.cause))
          )
        );
      },
    ])
  ) as Promised<Group>;
