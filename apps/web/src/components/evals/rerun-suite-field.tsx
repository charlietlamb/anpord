import type { EvalSuite } from "@anpord/schema/domain/evals";
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
import { CaretDownIcon, StackIcon } from "@phosphor-icons/react";
import { useState } from "react";

export function RerunSuiteField({
  onSelect,
  selected,
  suites,
}: {
  readonly onSelect: (suite: EvalSuite) => void;
  readonly selected: EvalSuite | null;
  readonly suites: readonly EvalSuite[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label="Suite"
            className="min-w-0 max-w-56 justify-between"
            size="sm"
            variant="outline"
          />
        }
      >
        <StackIcon />
        <span className="truncate">{selected?.name ?? "Choose a suite"}</span>
        <CaretDownIcon className="text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Find a suite…" />
          <CommandList>
            <CommandEmpty>No suites match.</CommandEmpty>
            <CommandGroup>
              {suites.map((suite) => (
                <CommandItem
                  data-checked={suite.id === selected?.id}
                  key={suite.id}
                  onSelect={() => {
                    onSelect(suite);
                    setOpen(false);
                  }}
                  value={suite.name}
                >
                  <StackIcon />
                  <span className="truncate">{suite.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
