import { Button } from "@anpord/ui/components/button";
import { Input } from "@anpord/ui/components/input";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";

interface PromptSearchProps {
  readonly onChange: (value: string) => void;
  readonly value: string;
}

export function PromptSearch({ onChange, value }: PromptSearchProps) {
  return (
    <div className="relative">
      <MagnifyingGlassIcon
        className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        size={15}
      />
      <Input
        aria-label="Search prompts"
        className="h-9 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by name, identifier or description…"
        type="search"
        value={value}
      />
      {value ? (
        <Button
          aria-label="Clear search"
          className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
          onClick={() => onChange("")}
          size="icon"
          variant="ghost"
        >
          <XIcon size={14} />
        </Button>
      ) : null}
    </div>
  );
}
