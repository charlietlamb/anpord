import type { EvalSuite } from "@anpord/schema/domain/evals";
import { PageTabs } from "@anpord/ui/components/ui/page-tabs";

const ALL = "all";

export function SuiteTabs({
  onSelect,
  selected,
  suites,
}: {
  readonly onSelect: (suite: string | null) => void;
  readonly selected: string | null;
  readonly suites: readonly EvalSuite[];
}) {
  if (suites.length < 2) {
    return null;
  }

  return (
    <PageTabs
      onChange={(value) => onSelect(value === ALL ? null : value)}
      options={[
        { label: "All suites", value: ALL },
        ...suites.map((suite) => ({ label: suite.name, value: suite.id })),
      ]}
      value={selected ?? ALL}
    />
  );
}
