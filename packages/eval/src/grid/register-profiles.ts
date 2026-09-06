import { Effect } from "effect";
import { profileVersionOf } from "../domain/profile-identity";
import { HarnessProfileRepository } from "../repositories/harness-profile-repository";
import type { StartGrid } from "./run";
import type { TaskProfile } from "./state";

/* The version hashes the content, so a reused profile finds its existing row and
   an edited one arrives as a new version. */
export const makeRegisterProfiles = Effect.gen(function* () {
  const profiles = yield* HarnessProfileRepository;

  return (input: StartGrid) =>
    Effect.forEach(
      input.tasks,
      (task) =>
        /* Nullish: a caller rebuilding a task from names omits the key entirely. */
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
