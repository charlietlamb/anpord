import { DEFAULT_SANDBOX } from "@anpord/schema/domain/evals";
import type { HarnessProfile } from "@anpord/schema/domain/harness-profile";

export interface KeyedVariant {
  readonly harness: string;
  readonly model: string;
  readonly profile?: HarnessProfile | undefined;
  readonly sandbox?: string | undefined;
}

/* Keyed on the resolved sandbox, so two variants that both omit one are the same
   column; and on the profile's name, not its content: one run cannot hold the
   same column twice. */
export const variantsAreDistinct = (variants: readonly KeyedVariant[]) => {
  const keys = variants.map((variant) =>
    [
      variant.harness,
      variant.model,
      variant.sandbox ?? DEFAULT_SANDBOX,
      variant.profile?.name ?? "",
    ].join("\0")
  );

  return new Set(keys).size === keys.length;
};
