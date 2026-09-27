import type { ListCases } from "@anpord/eval/repositories/case-reads-query";
import { EvalReads } from "@anpord/eval/services/eval-reads";
import { ModelCatalogues } from "@anpord/eval/services/model-catalogue";
import type { EvalPageCursor } from "@anpord/schema/domain/eval-read-models";
import type { EvalHarness } from "@anpord/schema/domain/eval-trial";
import { Effect } from "effect";
import { withEvalErrors } from "../../http/eval-errors";
import { organization } from "./current-organization";

export const listCases = (input: Omit<ListCases, "organizationId">) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).cases({
      ...input,
      organizationId: yield* organization,
    });
  });

export const listSuites = (
  cursor: EvalPageCursor | null,
  limit: number | undefined
) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).suites({
      cursor,
      limit,
      organizationId: yield* organization,
    });
  });

export const readSuite = (suiteId: string) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).suite(yield* organization, suiteId);
  }).pipe(withEvalErrors);

export const readCase = (caseId: string) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).case(yield* organization, caseId);
  }).pipe(withEvalErrors);

export const listModels = (harness: EvalHarness, query: string | undefined) =>
  Effect.flatMap(ModelCatalogues, (catalogues) =>
    catalogues.forHarness({ harness, query })
  );
