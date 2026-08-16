import {
  type AnpordClient,
  DEFAULT_BASE_URL,
  make,
} from "@anpord/schema/public/client";
import { FetchHttpClient, type HttpClientResponse } from "@effect/platform";
import { type Brand, Cause, Effect, Exit, Option, Redacted } from "effect";
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

type Unbranded<A> = A extends string & Brand.Brand<string>
  ? string
  : A extends number & Brand.Brand<string>
    ? number
    : A extends readonly (infer Item)[]
      ? readonly Unbranded<Item>[]
      : A extends Date
        ? A
        : A extends object
          ? { readonly [K in keyof A]: Unbranded<A[K]> }
          : A;

type WithoutResponse<A> = A extends readonly [
  unknown,
  HttpClientResponse.HttpClientResponse,
]
  ? never
  : A;

type Result<Method> = Method extends (
  request: never
) => Effect.Effect<infer A, unknown, never>
  ? WithoutResponse<A>
  : never;

type Request<Method> = Unbranded<Payload<Method>>;

type Promised<Group> = {
  readonly [Method in keyof Group]: Payload<Group[Method]> extends Record<
    string,
    never
  >
    ? (request?: Request<Group[Method]>) => Promise<Result<Group[Method]>>
    : (request: Request<Group[Method]>) => Promise<Result<Group[Method]>>;
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
