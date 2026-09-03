import { Database } from "@anpord/db/client";
import { evalHarnessProfile } from "@anpord/db/schema/evals/eval-harness-profiles";
import { IdGenerator } from "@anpord/ids/id";
import { and, eq, inArray } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";
import type { HarnessName } from "../domain/cell";
import type { EvalStoreError } from "../domain/errors";
import type { RequestedProfile } from "../domain/harness-profile";
import { head, tryStore } from "./query";

type ProfileRow = typeof evalHarnessProfile.$inferSelect;

/** A profile as stored: its content, and the row that names it. */
export interface StoredProfile extends RequestedProfile {
  readonly internalId: string;
  readonly version: string;
}

export interface ProfileDefinition extends RequestedProfile {
  readonly base: HarnessName;
  readonly organizationId: string;
  readonly version: string;
}

export interface HarnessProfileRepositoryShape {
  readonly findByInternalIds: (
    internalIds: readonly string[]
  ) => Effect.Effect<readonly StoredProfile[], EvalStoreError>;
  readonly insertIfAbsent: (
    input: ProfileDefinition
  ) => Effect.Effect<StoredProfile, EvalStoreError>;
}

export class HarnessProfileRepository extends Context.Tag(
  "@anpord/eval/HarnessProfileRepository"
)<HarnessProfileRepository, HarnessProfileRepositoryShape>() {}

const storedOf = (row: ProfileRow): StoredProfile => ({
  env: row.env,
  files: row.files,
  install: row.install,
  internalId: row.internalId,
  name: row.name,
  run: row.run,
  systemPrompt: row.systemPrompt,
  version: row.version,
});

export const HarnessProfileRepositoryLive = Layer.effect(
  HarnessProfileRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    const findByIdentity = (input: ProfileDefinition) =>
      tryStore("harnessProfile.findByIdentity", () =>
        db
          .select()
          .from(evalHarnessProfile)
          .where(
            and(
              eq(evalHarnessProfile.organizationId, input.organizationId),
              eq(evalHarnessProfile.name, input.name),
              eq(evalHarnessProfile.version, input.version)
            )
          )
      ).pipe(Effect.map(head));

    return HarnessProfileRepository.of({
      findByInternalIds: (internalIds) =>
        internalIds.length === 0
          ? Effect.succeed([])
          : tryStore("harnessProfile.findByInternalIds", () =>
              db
                .select()
                .from(evalHarnessProfile)
                .where(
                  inArray(evalHarnessProfile.internalId, [
                    ...new Set(internalIds),
                  ])
                )
            ).pipe(
              Effect.map((rows) => rows.map(storedOf)),
              Effect.withSpan("HarnessProfileRepository.findByInternalIds")
            ),

      insertIfAbsent: (input) =>
        Effect.gen(function* () {
          const internalId = yield* ids.generate("evalHarnessProfile");

          const rows = yield* tryStore("harnessProfile.insertIfAbsent", () =>
            db
              .insert(evalHarnessProfile)
              .values({
                base: input.base,
                env: input.env,
                files: input.files,
                install: input.install,
                internalId,
                name: input.name,
                organizationId: input.organizationId,
                run: input.run,
                systemPrompt: input.systemPrompt,
                version: input.version,
              })
              /* Left alone on conflict, the opposite of the task rule: the
                 version hashes the content, so a row that already exists
                 holds exactly this profile, and an edited one arrives as a
                 new version rather than as a change to this row. */
              .onConflictDoNothing({
                target: [
                  evalHarnessProfile.organizationId,
                  evalHarnessProfile.name,
                  evalHarnessProfile.version,
                ],
              })
              .returning()
          );

          const row = rows.at(0);

          if (row !== undefined) {
            return storedOf(row);
          }

          const existing = yield* findByIdentity(input);

          return yield* Option.match(existing, {
            onNone: () =>
              Effect.dieMessage(
                `profile ${input.name}@${input.version} was neither written nor found`
              ),
            onSome: (found) => Effect.succeed(storedOf(found)),
          });
        }).pipe(Effect.withSpan("HarnessProfileRepository.insertIfAbsent")),
    });
  })
);
