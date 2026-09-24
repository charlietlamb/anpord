import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@anpord/ui/components/ui/select";

const ALL = "all";

export function TagSelect({
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
    <Select
      onValueChange={(value) => onSelect(value === ALL ? null : value)}
      value={selected ?? ALL}
    >
      <SelectTrigger aria-label="Tag" className="max-w-48" size="sm">
        <SelectValue>{selected ?? "All tags"}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={ALL}>All tags</SelectItem>
        {tags.map((tag) => (
          <SelectItem key={tag} value={tag}>
            {tag}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
