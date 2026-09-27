import { Button } from "@anpord/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@anpord/ui/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@anpord/ui/components/ui/popover";
import { cn } from "@anpord/ui/lib/utils";

export interface HomeFilterOption {
  readonly label: string;
  readonly value: string;
}

export function HomeFilterMenu({
  all,
  noun,
  onChange,
  options,
  value,
}: {
  readonly all: string;
  readonly noun: string;
  readonly onChange: (value: string | null) => void;
  readonly options: readonly HomeFilterOption[];
  readonly value: string | null;
}) {
  const current = options.find((option) => option.value === value);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            className={cn("max-w-48 text-[13px]", current && "text-foreground")}
            size="sm"
            variant="subtle"
          />
        }
      >
        <span className="truncate">{current?.label ?? all}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <Command>
          <CommandInput placeholder={`Find a ${noun}…`} />
          <CommandList>
            <CommandEmpty>No {noun}s match.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                data-checked={value === null}
                onSelect={() => onChange(null)}
                value={all}
              >
                {all}
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  data-checked={option.value === value}
                  key={option.value}
                  onSelect={() => onChange(option.value)}
                  value={option.label}
                >
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
