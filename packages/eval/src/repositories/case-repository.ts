import { Database } from "@anpord/db/client";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { IdGenerator } from "@anpord/ids/id";
import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer, type Option } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { head, tryStore } from "./query";

type CaseRow = typeof evalCase.$inferSelect;

export interface CaseIdentity {
  readonly id: string;
  readonly name: string;
  readonly organizationId: string;
}

export interface CaseRepositoryShape {
  readonly findById: (
    organizationId: string,
    id: string
  ) => Effect.Effect<Option.Option<CaseRow>, EvalStoreError>;
  readonly resolve: (
    input: CaseIdentity
  ) => Effect.Effect<CaseRow, EvalStoreError>;
}

export class CaseRepository extends Context.Tag("@anpord/eval/CaseRepository")<
  CaseRepository,
  CaseRepositoryShape
>() {}

export const CaseRepositoryLive = Layer.effect(
  CaseRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    const findById = (organizationId: string, id: string) =>
      tryStore("case.findById", () =>
        db
          .select()
          .from(evalCase)
          .where(
            and(
              eq(evalCase.organizationId, organizationId),
              eq(evalCase.id, id)
            )
          )
      ).pipe(Effect.map(head), Effect.withSpan("CaseRepository.findById"));

    const resolve = (input: CaseIdentity) =>
      Effect.gen(function* () {
        const internalId = yield* ids.generate("evalCase");

        const rows = yield* tryStore("case.resolve", () =>
          db
            .insert(evalCase)
            .values({
              id: input.id,
              internalId,
              name: input.name,
              organizationId: input.organizationId,
            })
            /* The name follows the case, the id never moves: renaming a case
               keeps every reading behind it. */
            .onConflictDoUpdate({
              set: { name: input.name },
              target: [evalCase.organizationId, evalCase.id],
            })
            .returning()
        );

        const row = rows.at(0);

        return row === undefined
          ? yield* Effect.dieMessage(
              `case ${input.id} was neither written nor found`
            )
          : row;
      }).pipe(Effect.withSpan("CaseRepository.resolve"));

    return CaseRepository.of({ findById, resolve });
  })
);
