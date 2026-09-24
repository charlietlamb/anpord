import { Button } from "@anpord/ui/components/button";
import { Input } from "@anpord/ui/components/input";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";

interface PromptSearchProps {
  readonly onChange: (value: string) => void;
  readonly value: string;
}

export function PromptSearch({ onChange, value }: PromptSearchProps) {
  return (
    <div className="relative flex items-center">
      <MagnifyingGlassIcon
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground"
      />
      <Input
        aria-label="Search prompts"
        className="w-44 px-8 focus:w-56 [&::-webkit-search-cancel-button]:hidden"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search…"
        size="sm"
        type="search"
        value={value}
      />
      {value ? (
        <Button
          aria-label="Clear search"
          className="absolute right-0.5"
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
