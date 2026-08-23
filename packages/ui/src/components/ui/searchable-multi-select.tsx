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
import { useFittedCount } from "@anpord/ui/hooks/use-fitted-count";
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
  search,
  searchPlaceholder = "Search…",
  truncatedBy,
  value,
}: {
  readonly emptyLabel: string;
  readonly label: string;
  readonly onChange: (next: TValue[]) => void;
  readonly options: readonly SearchableOption<TValue>[];
  readonly renderOption?: (option: SearchableOption<TValue>) => ReactNode;
  readonly search?: {
    readonly onChange: (next: string) => void;
    readonly value: string;
  };
  readonly searchPlaceholder?: string;
  readonly truncatedBy?: number;
  readonly value: readonly TValue[];
}) {
  const [open, setOpen] = useState(false);
  const { fitted, overflowRef, rowRef } = useFittedCount(value.length);
  const hidden = value.slice(fitted);

  const optionFor = (item: TValue) =>
    options.find((option) => option.value === item);

  const labelOf = (item: TValue) => optionFor(item)?.label ?? item;

  const toggle = (item: TValue) =>
    onChange(
      value.includes(item)
        ? value.filter((each) => each !== item)
        : [...value, item]
    );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <div className="relative flex min-h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-input/20 px-2 py-1.5 text-left text-sm transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
        <PopoverTrigger
          render={
            <button
              aria-expanded={open}
              aria-label={label}
              className="absolute inset-0 size-full rounded-md outline-none"
              type="button"
            />
          }
        />

        {value.length === 0 ? (
          <span className="pointer-events-none text-muted-foreground">
            {emptyLabel}
          </span>
        ) : (
          <span
            className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-1 overflow-hidden"
            ref={rowRef}
          >
            {value.map((item, index) => {
              const option = optionFor(item);
              const chip = labelOf(item);

              return (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-md bg-muted py-0.5 pr-1 pl-2 text-xs",
                    index < fitted ? null : "pointer-events-none invisible"
                  )}
                  key={item}
                >
                  {option === undefined ? null : renderOption?.(option)}
                  {chip}
                  <button
                    aria-label={`Remove ${chip}`}
                    className="pointer-events-auto rounded-sm text-muted-foreground/70 hover:text-foreground"
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

            <span
              className={cn(
                "shrink-0 text-muted-foreground text-xs tabular-nums",
                hidden.length === 0 ? "invisible" : null
              )}
              ref={overflowRef}
              title={hidden.map((item) => labelOf(item)).join("\n")}
            >
              +{hidden.length}
            </span>
          </span>
        )}

        <CaretDownIcon className="pointer-events-none relative size-4 shrink-0 text-muted-foreground" />
      </div>

      <PopoverContent
        align="start"
        className="max-h-80 w-(--anchor-width) min-w-64 overflow-y-auto p-0"
      >
        <Command shouldFilter={search === undefined}>
          <CommandInput
            onValueChange={search?.onChange}
            placeholder={searchPlaceholder}
            value={search?.value}
          />

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
            {truncatedBy === undefined || truncatedBy <= 0 ? null : (
              <p className="px-2 py-1.5 text-muted-foreground text-xs">
                {truncatedBy} more match. Keep typing to narrow.
              </p>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
