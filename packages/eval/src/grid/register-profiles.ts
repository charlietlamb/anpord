import { Effect } from "effect";
import { profileVersionOf } from "../domain/profile-identity";
import { HarnessProfileRepository } from "../repositories/harness-profile-repository";
import type { StartGrid } from "./run";
import type { TaskProfile } from "./state";

/**
 * A row per distinct profile the run's tasks carry, positionally beside them.
 *
 * The version hashes the content, so a profile a run has used before finds its
 * existing row and every reading of it lands on the same cell; an edited one
 * arrives as a new version and compares against the old.
 */
export const makeRegisterProfiles = Effect.gen(function* () {
  const profiles = yield* HarnessProfileRepository;

  return (input: StartGrid) =>
    Effect.forEach(
      input.tasks,
      (task) =>
        /* Nullish rather than null: a caller that rebuilds a task from its
           names omits the key, and an absent profile is no profile. */
        task.profile == null
          ? Effect.succeed(null)
          : profiles
              .insertIfAbsent({
                ...task.profile,
                base: task.harness,
                organizationId: input.organizationId,
                version: profileVersionOf(task.profile),
              })
              .pipe(
                Effect.map(
                  (stored): TaskProfile => ({
                    internalId: stored.internalId,
                    name: stored.name,
                    version: stored.version,
                  })
                )
              ),
      { concurrency: 4 }
    );
});
