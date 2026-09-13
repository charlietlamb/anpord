import {
  type AnpordClient,
  DEFAULT_BASE_URL,
  make,
} from "@anpord/schema/public/client";
import { render, type Variables } from "@anpord/template/render";
import { FetchHttpClient } from "@effect/platform";
import { Cause, Effect, Exit, ManagedRuntime, Option, Redacted } from "effect";
import { compileDefinition } from "../evals/compiler";
import { sourceUrlOf } from "../evals/define";
import { tooLargeToSubmit } from "../evals/request-size";
import type { EvalDefinition } from "../evals/types";
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
import { AnpordError, asAnpordError, MissingApiKey } from "./errors";
import { type Promised, promised } from "./promised";
import type { VariablesFor } from "./variables";
import { type WaitOptions, waitForRun } from "./wait";

export interface AnpordOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;

  readonly cache?: boolean | CacheOptions;
}

const resolveApiKey = (provided: string | undefined) => {
  const apiKey = provided ?? globalThis.process?.env?.ANPORD_API_KEY;
  if (!apiKey) {
    throw new MissingApiKey();
  }
  return apiKey;
};

type Prompts = Promised<AnpordClient["prompts"]>;
type Prompt = Awaited<ReturnType<Prompts["get"]>>;

type Evals = Promised<AnpordClient["evals"]>;
type StartOptions = Parameters<Evals["start"]>[0];
type StartInput = StartOptions | EvalDefinition;
type Run = Awaited<ReturnType<Evals["get"]>>;

export interface EvalsSurface extends Omit<Evals, "start"> {
  /** Starts a run from a request or an imported eval. */
  readonly start: (input: StartInput) => ReturnType<Evals["start"]>;
  /** Starts a run and resolves once it finishes. */
  readonly startAndWait: (
    input: StartInput & Partial<WaitOptions>
  ) => Promise<Run>;
  /** Polls an already-started run until it finishes. */
  readonly wait: (
    options: { readonly id: string } & WaitOptions
  ) => Promise<Run>;
}

export type PromptResult = Prompt & { readonly anpord: PromptMetadata };

export interface PromptsSurface extends Omit<Prompts, "get"> {
  readonly get: <const Id extends string, const Given extends Variables>(
    options: GetPromptOptions & {
      readonly id: Id;
      readonly variables?: VariablesFor<Id, Given> & Given;
    }
  ) => Promise<PromptResult>;
}

export class Anpord {
  readonly evals: EvalsSurface;
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
    const evals = promised(client.evals);

    /* Checked on the way out rather than at compile time, so a suite too big
       to submit can still be compiled and inspected. */
    const requestOf = async (input: StartInput): Promise<StartOptions> => {
      const request =
        sourceUrlOf(input as EvalDefinition) === undefined
          ? (input as StartOptions)
          : ((await compileDefinition(
              input as EvalDefinition
            )) as StartOptions);
      const tooLarge = tooLargeToSubmit(request);

      if (tooLarge !== null) {
        throw new AnpordError(tooLarge, { cause: null });
      }

      return request;
    };

    this.evals = {
      ...evals,
      start: async (input) => await evals.start(await requestOf(input)),
      startAndWait: async (options) => {
        const {
          maxIntervalMs,
          onProgress,
          pollIntervalMs,
          signal,
          timeoutMs,
          ...input
        } = options as StartOptions & WaitOptions;
        const { id } = await evals.start(await requestOf(input as StartInput));
        return await waitForRun(evals.get, id, {
          maxIntervalMs,
          onProgress,
          pollIntervalMs,
          signal,
          timeoutMs,
        });
      },
      wait: ({ id, ...options }) => waitForRun(evals.get, id, options),
    };

    const forget = (id: string) =>
      this.runtime
        .runPromise(
          Effect.flatMap(PromptCache, (cache) => cache.invalidate(id))
        )
        .catch(() => undefined);

    this.prompts = {
      ...group,
      get: (request) => this.resolve(request),
      promote: invalidating(group.promote, forget),
      update: invalidating(group.update, forget),
    };
  }

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

    const prompt = exit.value.value;

    const value =
      options.variables === undefined
        ? { ...prompt }
        : {
            ...prompt,
            content: render(prompt.content, options.variables).content,
          };

    return Object.defineProperty(value, "anpord", {
      enumerable: false,
      value: exit.value.metadata,
    }) as PromptResult;
  }
}

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
