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
        className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground"
      />
      <Input
        aria-label={label}
        className={cn(
          "pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden",
          className
        )}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {value ? (
        <Button
          aria-label="Clear search"
          className="absolute right-1.5"
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
