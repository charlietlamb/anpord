import { AgeCell } from "@sphynx/ui/components/evals/age-cell";
import type { DateTime } from "effect";

export function LastUsedCell({ at }: { readonly at: DateTime.Utc | null }) {
  return at === null ? (
    <span className="text-muted-foreground">Never</span>
  ) : (
    <AgeCell at={at.epochMillis} />
  );
}
