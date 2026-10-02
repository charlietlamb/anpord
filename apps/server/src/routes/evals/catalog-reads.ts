import type { ListCases } from "@sphynx/eval/repositories/case-reads-query";
import { EvalReads } from "@sphynx/eval/services/eval-reads";
import { ModelCatalogues } from "@sphynx/eval/services/model-catalogue";
import type { EvalPageCursor } from "@sphynx/schema/domain/eval-read-models";
import type { EvalHarness } from "@sphynx/schema/domain/eval-trial";
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
