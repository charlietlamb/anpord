"use client";

import { fieldVariants } from "@anpord/ui/lib/field";
import {
  Command,
  CommandEmpty,
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
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";

export interface SelectOption<TValue extends string> {
  readonly label: string;
  readonly value: TValue;
}

export function SearchableSelect<TValue extends string>({
  className,
  label,
  onChange,
  options,
  renderOption,
  searchPlaceholder = "Search",
  value,
}: {
  readonly className?: string;
  readonly label: string;
  readonly onChange: (next: TValue) => void;
  readonly options: readonly SelectOption<TValue>[];
  readonly renderOption?: (option: SelectOption<TValue>) => ReactNode;
  readonly searchPlaceholder?: string;
  readonly value: TValue | undefined;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <button
            aria-expanded={open}
            aria-label={label}
            className={cn(
              fieldVariants({ size: "lg" }),
              "flex items-center gap-2 text-left",
              className
            )}
            type="button"
          >
            {selected === undefined ? (
              <span className="text-muted-foreground">{label}</span>
            ) : (
              <>
                {renderOption?.(selected)}
                <span className="min-w-0 flex-1 truncate">
                  {selected.label}
                </span>
              </>
            )}

            <CaretDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
        }
      />

      <PopoverContent
        align="start"
        className="max-h-80 w-(--anchor-width) min-w-64 overflow-y-auto p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />

          <CommandList>
            <CommandEmpty>Nothing matches that.</CommandEmpty>

            {options.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                value={option.label}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {renderOption?.(option)}
                  <span className="min-w-0 truncate">{option.label}</span>
                </span>

                <CheckIcon
                  className={cn(
                    "size-4 shrink-0",
                    option.value === value ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
