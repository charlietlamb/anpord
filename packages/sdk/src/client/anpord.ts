import {
  type AnpordClient,
  DEFAULT_BASE_URL,
  make,
} from "@anpord/schema/public/client";
import { render } from "@anpord/template/render";
import { FetchHttpClient, type HttpClientResponse } from "@effect/platform";
import {
  type Brand,
  Cause,
  Effect,
  Exit,
  ManagedRuntime,
  Option,
  Redacted,
} from "effect";
import { noopLayer } from "./cache/noop";
import { layer, PromptCache } from "./cache/prompt-cache";
import { resolvePrompt } from "./cache/resolve";
import {
  type CacheOptions,
  cacheEnabled,
  settingsFrom,
} from "./cache/settings";
import type {
  GetPromptOptions,
  PromptMetadata,
  PromptSelector,
} from "./cache/types";
import { asAnpordError, MissingApiKey } from "./errors";

export interface AnpordOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  /** False disables it, an object tunes it. Answers are held for fifteen
   * seconds and served while a refresh runs behind them. */
  readonly cache?: boolean | CacheOptions;
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

type Prompts = Promised<AnpordClient["prompts"]>;
type Prompt = Awaited<ReturnType<Prompts["get"]>>;

export type PromptResult = Prompt & { readonly anpord: PromptMetadata };

export interface PromptsSurface extends Omit<Prompts, "get"> {
  readonly get: (options: GetPromptOptions) => Promise<PromptResult>;
}

export class Anpord {
  readonly prompts: PromptsSurface;

  private readonly runtime: ManagedRuntime.ManagedRuntime<PromptCache, never>;

  constructor(options: AnpordOptions = {}) {
    const apiKey = resolveApiKey(options.apiKey);
    const client = make({
      apiKey: Redacted.make(apiKey),
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.runSync);

    const fetch = (selector: PromptSelector) =>
      client.prompts.get({ payload: selector as never });

    this.runtime = ManagedRuntime.make(
      cacheEnabled(options.cache)
        ? layer(settingsFrom(options.cache), fetch)
        : noopLayer(fetch)
    );

    const group = promised(client.prompts);

    const forget = (id: string) =>
      this.runtime
        .runPromise(
          Effect.flatMap(PromptCache, (cache) => cache.invalidate(id))
        )
        .catch(() => undefined);

    this.prompts = {
      ...group,
      archive: invalidating(group.archive, forget),
      get: (request) => this.resolve(request),
      promote: invalidating(group.promote, forget),
      update: invalidating(group.update, forget),
    };
  }

  /** Background refreshes belong to this runtime, so a caller who is finished
   * with the client can take them with it. */
  dispose() {
    return this.runtime.dispose();
  }

  [Symbol.asyncDispose]() {
    return this.runtime.dispose();
  }

  private async resolve(options: GetPromptOptions): Promise<PromptResult> {
    const exit = await this.runtime.runPromiseExit(resolvePrompt(options));
    if (Exit.isFailure(exit)) {
      throw asAnpordError(
        Cause.failureOption(exit.cause).pipe(
          Option.getOrElse(() => Cause.squash(exit.cause))
        )
      );
    }

    const prompt = exit.value.value as Prompt;
    const value =
      options.variables === undefined
        ? prompt
        : {
            ...prompt,
            content: render(prompt.content, options.variables).content,
          };

    /** Not enumerable, so a caller who serialises a prompt or compares it
     * against a fixture sees exactly what they saw before. */
    return Object.defineProperty(value, "anpord", {
      enumerable: false,
      value: exit.value.metadata,
    }) as PromptResult;
  }
}

/** A write this process made is a write this process knows about, so the
 * answer it holds is knowably wrong the moment the write succeeds. */
const invalidating =
  <Request extends { readonly id: string }, Value>(
    write: (request: Request) => Promise<Value>,
    forget: (id: string) => Promise<void>
  ) =>
  async (request: Request) => {
    const result = await write(request);
    await forget(request.id);
    return result;
  };

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
