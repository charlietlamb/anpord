import { Button } from "@anpord/ui/components/button";
import { Input } from "@anpord/ui/components/input";
import { cn } from "@anpord/ui/lib/utils";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";

interface SearchInputProps {
  readonly className?: string;
  readonly grow?: boolean;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly value: string;
}

export function SearchInput({
  className,
  grow = false,
  label,
  onChange,
  placeholder = "Search",
  value,
}: SearchInputProps) {
  return (
    <div
      className={cn("relative flex items-center", grow && "min-w-48 flex-1")}
    >
      <MagnifyingGlassIcon
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground"
      />
      <Input
        aria-label={label}
        className={cn(
          "rounded-md border-border bg-alpha-4 pr-8 pl-8 text-sm focus-within:ring-0 focus-visible:ring-0 dark:bg-alpha-4 [&::-webkit-search-cancel-button]:hidden",
          className
        )}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        size="sm"
        type="search"
        value={value}
      />
      {value ? (
        <Button
          aria-label="Clear search"
          className="absolute right-1"
          onClick={() => onChange("")}
          size="icon-xs"
          variant="bare"
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  );
}
