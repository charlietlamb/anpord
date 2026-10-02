import type { EvalHomeRange } from "@sphynx/schema/domain/eval-home";
import type { EvalSuite } from "@sphynx/schema/domain/evals";
import { PageTabs } from "@sphynx/ui/components/ui/page-tabs";
import { HomeFilterMenu } from "@/components/home/home-filter-menu";

const RANGES = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
] as const;

export function HomeToolbar({
  onRange,
  onSuite,
  onVariant,
  range,
  suite,
  suites,
  variant,
  variants,
}: {
  readonly onRange: (range: EvalHomeRange) => void;
  readonly onSuite: (suite: string | null) => void;
  readonly onVariant: (variant: string | null) => void;
  readonly range: EvalHomeRange;
  readonly suite: string | null;
  readonly suites: readonly EvalSuite[];
  readonly variant: string | null;
  readonly variants: readonly string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PageTabs onChange={onRange} options={RANGES} value={range} />
      <HomeFilterMenu
        all="All suites"
        noun="suite"
        onChange={onSuite}
        options={suites.map((entry) => ({
          label: entry.name,
          value: entry.id,
        }))}
        value={suite}
      />
      <HomeFilterMenu
        all="All variants"
        noun="variant"
        onChange={onVariant}
        options={variants.map((label) => ({ label, value: label }))}
        value={variant}
      />
    </div>
  );
}
