import { Forbidden } from "@anpord/schema/domain/errors";
import type { Permission } from "@anpord/schema/domain/permissions";
import { grants } from "@anpord/schema/domain/permissions";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { Effect } from "effect";

/**
 * Turns a group's permission table into a guard the handlers apply by name, so
 * a handler states what it does and the table states who may do it.
 *
 * Reading the permission from the table rather than from an argument is what
 * keeps the two in step: the table is exhaustive over the group's endpoints, so
 * a new route has to appear there before it can be handled at all.
 */
export const guardBy =
  <Name extends string>(permissions: Record<Name, Permission>) =>
  <A, E, R>(name: Name, handler: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const actor = yield* CurrentActor;
      const required = permissions[name];

      if (!grants(actor.permissions, required)) {
        return yield* Effect.fail(
          new Forbidden({
            message: `This action needs the ${required} permission.`,
          })
        );
      }

      return yield* handler;
    });
