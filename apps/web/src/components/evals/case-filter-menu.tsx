import type { EvalSuite } from "@anpord/schema/domain/evals";
import { Button } from "@anpord/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@anpord/ui/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@anpord/ui/components/ui/popover";
import { cn } from "@anpord/ui/lib/utils";
import {
  FunnelSimpleIcon,
  StackIcon,
  TagIcon,
  XIcon,
} from "@phosphor-icons/react";

export function CaseFilterMenu({
  onClear,
  onSuite,
  onTag,
  suite,
  suites,
  tag,
  tags,
}: {
  readonly onClear: () => void;
  readonly onSuite: (value: string | null) => void;
  readonly onTag: (value: string | null) => void;
  readonly suite: string | null;
  readonly suites: readonly EvalSuite[];
  readonly tag: string | null;
  readonly tags: readonly string[];
}) {
  const active = (suite === null ? 0 : 1) + (tag === null ? 0 : 1);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label="Filter cases"
            className={cn("relative", active > 0 && "text-foreground")}
            size="icon"
            variant="subtle"
          />
        }
      >
        <FunnelSimpleIcon />
        {active > 0 ? (
          <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary" />
        ) : null}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Filter by…" />
          <CommandList>
            <CommandEmpty>No suites or tags match.</CommandEmpty>
            {suites.length === 0 ? null : (
              <CommandGroup heading="Suite">
                {suites.map((entry) => (
                  <CommandItem
                    data-checked={entry.id === suite}
                    key={entry.id}
                    onSelect={() =>
                      onSuite(entry.id === suite ? null : entry.id)
                    }
                    value={`suite ${entry.name}`}
                  >
                    <StackIcon />
                    <span className="truncate">{entry.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {tags.length === 0 ? null : (
              <CommandGroup heading="Tag">
                {tags.map((entry) => (
                  <CommandItem
                    data-checked={entry === tag}
                    key={entry}
                    onSelect={() => onTag(entry === tag ? null : entry)}
                    value={`tag ${entry}`}
                  >
                    <TagIcon />
                    <span className="truncate">{entry}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {active > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={onClear} value="clear filters">
                    <XIcon />
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
