import { PageTabs } from "@anpord/ui/components/ui/page-tabs";

const ALL = "all";

export function TagFilter({
  onSelect,
  selected,
  tags,
}: {
  readonly onSelect: (tag: string | null) => void;
  readonly selected: string | null;
  readonly tags: readonly string[];
}) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <PageTabs
      onChange={(value) => onSelect(value === ALL ? null : value)}
      options={[
        { label: "All", value: ALL },
        ...tags.map((tag) => ({ label: tag, value: tag })),
      ]}
      value={selected ?? ALL}
    />
  );
}
