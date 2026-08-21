import { Button } from "@anpord/ui/components/button";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";

interface PromptSearchProps {
  readonly onChange: (value: string) => void;
  readonly value: string;
}

/**
 * Search sits in the row of controls rather than across the page: it is one of
 * the things you can do here, not the first thing to read.
 */
export function PromptSearch({ onChange, value }: PromptSearchProps) {
  return (
    <div className="relative flex items-center">
      <MagnifyingGlassIcon
        className="pointer-events-none absolute left-2 text-muted-foreground"
        size={14}
      />
      <input
        aria-label="Search prompts"
        className="h-8 w-44 rounded-md border border-border-faint bg-alpha-4 pr-7 pl-7 text-label outline-none transition-colors placeholder:text-muted-foreground focus:w-56 focus:border-border [&::-webkit-search-cancel-button]:hidden"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search…"
        type="search"
        value={value}
      />
      {value ? (
        <Button
          aria-label="Clear search"
          className="absolute right-0.5 size-6 rounded"
          onClick={() => onChange("")}
          size="icon-sm"
          variant="bare"
        >
          <XIcon size={13} />
        </Button>
      ) : null}
    </div>
  );
}
