import type {
  EvalVariantRequest,
  StartBatchRequest,
} from "@anpord/schema/domain/eval-definition";
import type { EvalCaseId } from "@anpord/schema/domain/eval-limits";
import { Data, Effect, Option } from "effect";
import { labelOfRequest } from "./eval-local";

export interface Selection {
  readonly caseId: Option.Option<EvalCaseId>;
  readonly variants: readonly string[];
}

class NothingSelected extends Data.TaggedError("NothingSelected")<{
  readonly available: readonly string[];
  readonly file: string;
  readonly kind: "case" | "variant";
  readonly wanted: string;
}> {
  override get message() {
    return `${this.file} has no ${this.kind} ${this.wanted}. It has ${this.available.join(", ")}.`;
  }
}

const selectCases = (
  file: string,
  request: StartBatchRequest,
  caseId: Option.Option<EvalCaseId>
) =>
  Effect.gen(function* () {
    if (Option.isNone(caseId)) {
      return request.cases;
    }

    const kept = request.cases.filter((subject) => subject.id === caseId.value);
    if (kept.length === 0) {
      return yield* new NothingSelected({
        available: request.cases.map((subject) => subject.id),
        file,
        kind: "case",
        wanted: caseId.value,
      });
    }

    return kept;
  });

const selects = (variant: EvalVariantRequest, wanted: string) =>
  wanted === `${variant.harness}/${variant.model}` ||
  wanted === labelOfRequest(variant);

const selectVariants = (
  file: string,
  request: StartBatchRequest,
  wanted: readonly string[]
) =>
  Effect.gen(function* () {
    if (wanted.length === 0) {
      return request.variants;
    }

    const missing = wanted.find(
      (label) => !request.variants.some((variant) => selects(variant, label))
    );
    if (missing !== undefined) {
      return yield* new NothingSelected({
        available: request.variants.map(labelOfRequest),
        file,
        kind: "variant",
        wanted: missing,
      });
    }

    return request.variants.filter((variant) =>
      wanted.some((label) => selects(variant, label))
    );
  });

export const selectFrom = (
  file: string,
  request: StartBatchRequest,
  selection: Selection
) =>
  Effect.gen(function* () {
    const cases = yield* selectCases(file, request, selection.caseId);
    const variants = yield* selectVariants(file, request, selection.variants);

    return { ...request, cases, variants } satisfies StartBatchRequest;
  });
