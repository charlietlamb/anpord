import type {
  EvalVariantRequest,
  StartBatchRequest,
} from "@sphynx/schema/domain/eval-definition";
import type { EvalCaseId } from "@sphynx/schema/domain/eval-limits";
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

class AmbiguousVariant extends Data.TaggedError("AmbiguousVariant")<{
  readonly file: string;
  readonly matches: readonly string[];
  readonly wanted: string;
}> {
  override get message() {
    return `${this.wanted} matches ${this.matches.length} variants in ${this.file}: ${this.matches.join(", ")}. Name one of them.`;
  }
}

const matchesFor = (
  variants: readonly EvalVariantRequest[],
  wanted: string
) => {
  const exact = variants.filter(
    (variant) => labelOfRequest(variant) === wanted
  );

  return exact.length > 0
    ? exact
    : variants.filter(
        (variant) =>
          `${variant.harness}/${variant.model}` === wanted ||
          variant.profile?.name === wanted
      );
};

const selectVariant = (
  file: string,
  variants: readonly EvalVariantRequest[],
  wanted: string
) =>
  Effect.gen(function* () {
    const matches = matchesFor(variants, wanted);
    const labels = [...new Set(matches.map(labelOfRequest))];

    if (labels.length === 0) {
      return yield* new NothingSelected({
        available: variants.map(labelOfRequest),
        file,
        kind: "variant",
        wanted,
      });
    }
    if (labels.length > 1) {
      return yield* new AmbiguousVariant({ file, matches: labels, wanted });
    }

    return matches;
  });

const selectVariants = (
  file: string,
  request: StartBatchRequest,
  wanted: readonly string[]
) =>
  Effect.gen(function* () {
    if (wanted.length === 0) {
      return request.variants;
    }

    const chosen = new Set(
      (yield* Effect.forEach(wanted, (label) =>
        selectVariant(file, request.variants, label)
      )).flat()
    );

    return request.variants.filter((variant) => chosen.has(variant));
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
