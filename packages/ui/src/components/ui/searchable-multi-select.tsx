"use client";

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
import { CaretDownIcon, CheckIcon, XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useState } from "react";

export interface SearchableOption<TValue extends string> {
  readonly description?: string;
  readonly label: string;
  readonly value: TValue;
}

/**
 * Several values from a list, searched rather than scrolled.
 *
 * The search sits inside the popup rather than in the trigger, so the trigger
 * keeps showing what is already chosen while the list is filtered. Typing
 * narrows; clicking toggles and leaves the popup open, because choosing three
 * models is one gesture and reopening a menu twice to do it is two more.
 *
 * Selections read back as chips on the trigger, each removable without opening
 * anything, so undoing a choice costs less than making it.
 */
export function SearchableMultiSelect<TValue extends string>({
  emptyLabel,
  label,
  onChange,
  options,
  renderOption,
  searchPlaceholder = "Search…",
  value,
}: {
  readonly emptyLabel: string;
  readonly label: string;
  readonly onChange: (next: TValue[]) => void;
  readonly options: readonly SearchableOption<TValue>[];
  /** Draws the mark beside an option and its chip, for a list whose items are
   * things rather than words. */
  readonly renderOption?: (option: SearchableOption<TValue>) => ReactNode;
  readonly searchPlaceholder?: string;
  readonly value: readonly TValue[];
}) {
  const [open, setOpen] = useState(false);

  const optionFor = (item: TValue) =>
    options.find((option) => option.value === item);

  const toggle = (item: TValue) =>
    onChange(
      value.includes(item)
        ? value.filter((each) => each !== item)
        : [...value, item]
    );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <button
            aria-expanded={open}
            aria-label={label}
            className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-input/20 px-2 py-1.5 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            type="button"
          />
        }
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground">{emptyLabel}</span>
        ) : (
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {value.map((item) => {
              const option = optionFor(item);

              return (
                <span
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted py-0.5 pr-1 pl-2 text-xs"
                  key={item}
                >
                  {option === undefined ? null : renderOption?.(option)}
                  {option?.label ?? item}
                  <button
                    aria-label={`Remove ${option?.label ?? item}`}
                    className="rounded-sm text-muted-foreground/70 hover:text-foreground"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onChange(value.filter((each) => each !== item));
                    }}
                    type="button"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              );
            })}
          </span>
        )}

        <CaretDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />

          <CommandList>
            <CommandEmpty>Nothing matches that.</CommandEmpty>

            {options.map((option) => {
              const selected = value.includes(option.value);

              return (
                <CommandItem
                  key={option.value}
                  onSelect={() => toggle(option.value)}
                  value={`${option.value} ${option.label}`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    {renderOption?.(option)}
                    <span className="min-w-0">
                      <span className="block truncate">{option.label}</span>
                      {option.description === undefined ? null : (
                        <span className="block truncate text-muted-foreground text-xs">
                          {option.description}
                        </span>
                      )}
                    </span>
                  </span>

                  <CheckIcon
                    className={cn(
                      "size-4 shrink-0",
                      selected ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
