import { SkeletonScope } from "@anpord/ui/components/ui/skeleton-scope";
import { TrialView } from "@/components/evals/trial-view";
import {
  placeholderRun,
  placeholderTrial,
} from "@/lib/evals/eval-placeholders";

export function TrialPlaceholder() {
  return (
    <SkeletonScope>
      <TrialView run={placeholderRun(0)} trial={placeholderTrial(1)} />
    </SkeletonScope>
  );
}
