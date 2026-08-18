import type { HttpClientResponse } from "@effect/platform";
import { type Brand, Cause, Effect, Exit, Option } from "effect";
import { asAnpordError } from "./errors";

type Payload<Method> = Method extends (request: {
  readonly payload: infer P;
}) => unknown
  ? P
  : never;

/** Brands are the server's business. A caller passes the string they have
 * rather than one the schema has blessed. */
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

/** The Effect client as promises, so a caller who does not use Effect never
 * meets it. A group with no payload takes no argument. */
export type Promised<Group> = {
  readonly [Method in keyof Group]: Payload<Group[Method]> extends Record<
    string,
    never
  >
    ? (request?: Request<Group[Method]>) => Promise<Result<Group[Method]>>
    : (request: Request<Group[Method]>) => Promise<Result<Group[Method]>>;
};

export const promised = <Group extends Record<string, unknown>>(group: Group) =>
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
