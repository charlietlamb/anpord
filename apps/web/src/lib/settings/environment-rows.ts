import type { Subscription } from "@sphynx/schema/domain/credentials";
import type { EnvironmentVariable } from "@sphynx/schema/domain/environment";

export type EnvironmentRow =
  | { readonly kind: "subscription"; readonly subscription: Subscription }
  | { readonly kind: "variable"; readonly variable: EnvironmentVariable };

export const environmentRows = (
  subscriptions: readonly Subscription[],
  variables: readonly EnvironmentVariable[]
): readonly EnvironmentRow[] => [
  ...subscriptions.map((subscription) => ({
    kind: "subscription" as const,
    subscription,
  })),
  ...variables
    .toSorted(
      (a, b) => a.name.localeCompare(b.name) || a.scope.localeCompare(b.scope)
    )
    .map((variable) => ({ kind: "variable" as const, variable })),
];
