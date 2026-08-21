import { Effect } from "effect";
import { UnreadableHarness } from "../domain/errors";
import { parseHarness } from "../domain/harness-spec";
import type { Variant } from "./define";

export const variantName = (variant: Variant) =>
  variant.name ?? `${variant.harness} ${variant.model} on ${variant.provider}`;

/** Reads every variant's harness, or fails before a sandbox opens.
 *
 * Validated rather than short-circuited, so a file with three typos reports
 * three. */
export const resolveVariants = (variants: readonly Variant[]) =>
  Effect.validateAll(variants, (variant) => {
    const harness = parseHarness(variant.harness);

    return harness === null
      ? Effect.fail(new UnreadableHarness({ spec: variant.harness }))
      : Effect.succeed({ ...variant, harness, label: variantName(variant) });
  }).pipe(Effect.withSpan("Eval.resolveVariants"));
