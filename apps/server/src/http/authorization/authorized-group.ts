import { Forbidden } from "@anpord/schema/domain/errors";
import type { Permission } from "@anpord/schema/domain/permissions";
import { grants } from "@anpord/schema/domain/permissions";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import type { HttpApiBuilder, HttpApiEndpoint } from "@effect/platform";
import { Effect } from "effect";

interface RouteOptions {
  /** The permission a caller must hold to reach this endpoint. */
  readonly permission: Permission;
  readonly uninterruptible?: boolean;
}

/**
 * The builder's own `handle`, with the permission between the name and the
 * handler. Written against the library's types rather than inferred from the
 * value, so the name stays checked against the endpoints still unhandled, the
 * handler keeps its inferred path, payload, and url params, and the group's
 * "Endpoint not handled" exhaustiveness check survives the wrapper.
 */
type Authorized<E, Provides, R, Endpoints extends AnyEndpoint> = Omit<
  HttpApiBuilder.Handlers<E, Provides, R, Endpoints>,
  "handle"
> & {
  handle<Name extends HttpApiEndpoint.HttpApiEndpoint.Name<Endpoints>, R1>(
    name: Name,
    options: RouteOptions,
    handler: HttpApiEndpoint.HttpApiEndpoint.HandlerWithName<
      Endpoints,
      Name,
      E,
      R1
    >
  ): Authorized<
    E,
    Provides,
    | R
    | Exclude<
        HttpApiEndpoint.HttpApiEndpoint.ExcludeProvided<
          Endpoints,
          Name,
          R1 | HttpApiEndpoint.HttpApiEndpoint.ContextWithName<Endpoints, Name>
        >,
        Provides
      >,
    HttpApiEndpoint.HttpApiEndpoint.ExcludeName<Endpoints, Name>
  >;
  /** Hands the group back to the builder once every endpoint is handled. The
   * wrapper reorders `handle`, which changes the type the builder recognises,
   * so the chain ends by naming itself as what it has been all along. */
  readonly done: HttpApiBuilder.Handlers<E, Provides, R, Endpoints>;
};

type AnyEndpoint = HttpApiEndpoint.HttpApiEndpoint.Any;

interface Builder {
  handle: (name: string, handler: unknown, options?: unknown) => Builder;
}

const authorize = (required: Permission) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    if (!grants(actor.permissions, required)) {
      return yield* Effect.fail(
        new Forbidden({
          message: `This action needs the ${required} permission.`,
        })
      );
    }
  });

export const authorized = <E, Provides, R, Endpoints extends AnyEndpoint>(
  handlers: HttpApiBuilder.Handlers<E, Provides, R, Endpoints>
): Authorized<E, Provides, R, Endpoints> => {
  const wrap = (target: Builder): Builder =>
    new Proxy(target, {
      get(source, property, receiver) {
        if (property === "done") {
          return source;
        }

        if (property !== "handle") {
          return Reflect.get(source, property, receiver);
        }

        return (name: string, options: RouteOptions, handler: unknown) => {
          const guarded =
            typeof handler === "function"
              ? (...args: readonly unknown[]) =>
                  Effect.zipRight(
                    authorize(options.permission),
                    handler(...args) as Effect.Effect<unknown, unknown, unknown>
                  )
              : handler;

          return wrap(
            source.handle(name, guarded, {
              uninterruptible: options.uninterruptible,
            })
          );
        };
      },
    });

  return wrap(handlers as unknown as Builder) as unknown as Authorized<
    E,
    Provides,
    R,
    Endpoints
  >;
};
