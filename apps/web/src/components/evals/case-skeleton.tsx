import { Skeleton } from "@anpord/ui/components/skeleton";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { FlaskIcon } from "@phosphor-icons/react";
import { EvalLayout, EvalMain, EvalRail } from "@/components/evals/eval-layout";
import {
  type RailFactShape,
  RailFactSkeleton,
} from "@/components/evals/rail-fact-skeleton";

const CASE: readonly RailFactShape[] = [{ width: "w-32" }];

const VARIANT: readonly RailFactShape[] = [
  { width: "w-28" },
  { width: "w-20" },
  { width: "w-16" },
];

const READINGS = 5;

export function CaseSkeleton() {
  return (
    <EvalLayout>
      <EvalMain>
        <section className="flex flex-col gap-1.5">
          <span className="flex h-8 items-center gap-1.5">
            <FlaskIcon className="size-4 shrink-0 text-muted-foreground" />
            <Skeleton className="h-3.5 w-40" />
          </span>

          <div className="flex flex-col">
            {Array.from({ length: READINGS }, (_, index) => (
              <span
                className="flex items-center justify-between py-2"
                key={`reading-${index satisfies number}`}
              >
                <span className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-16" />
                </span>
                <Skeleton className="h-3 w-20" />
              </span>
            ))}
          </div>
        </section>
      </EvalMain>

      <EvalRail>
        <RailSection title="Case">
          <RailFactSkeleton facts={CASE} />
        </RailSection>

        <RailSection title="Variant">
          <RailFactSkeleton facts={VARIANT} />
        </RailSection>
      </EvalRail>
    </EvalLayout>
  );
}
