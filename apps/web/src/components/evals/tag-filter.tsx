import { cn } from "@anpord/ui/lib/utils";

/* Rendered only where there is a choice to make: one tag filters nothing, and
   none at all is the common case until someone starts grouping. */
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
    <nav
      aria-label="Filter by tag"
      className="flex flex-wrap items-center gap-1"
    >
      <TagChip
        active={selected === null}
        label="All"
        onSelect={() => onSelect(null)}
      />
      {tags.map((tag) => (
        <TagChip
          active={selected === tag}
          key={tag}
          label={tag}
          onSelect={() => onSelect(tag)}
        />
      ))}
    </nav>
  );
}

function TagChip({
  active,
  label,
  onSelect,
}: {
  readonly active: boolean;
  readonly label: string;
  readonly onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "rounded-[4px] px-2 py-1 text-xs transition-colors",
        active
          ? "bg-alpha-8 text-foreground"
          : "text-muted-foreground hover:bg-alpha-4 hover:text-foreground"
      )}
      onClick={onSelect}
      type="button"
    >
      {label}
    </button>
  );
}
