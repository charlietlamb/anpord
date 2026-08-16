import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { Checkbox } from "@anpord/ui/components/ui/checkbox";
import { FunnelSimpleIcon, XIcon } from "@phosphor-icons/react";

interface FilterOption<T extends string> {
  readonly label: string;
  readonly value: T;
}

interface FilterSectionProps<T extends string> {
  readonly label: string;
  readonly onChange: (value: T) => void;
  readonly options: readonly FilterOption<T>[];
  readonly value: T;
}

function FilterSection<T extends string>({
  label,
  onChange,
  options,
  value,
}: FilterSectionProps<T>) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="text-muted-foreground text-xs">
        {label}
      </DropdownMenuLabel>
      {options.map((option) => (
        <DropdownMenuItem
          closeOnClick={false}
          key={option.value}
          onClick={(event) => {
            event.preventDefault();
            onChange(option.value);
          }}
        >
          <Checkbox checked={value === option.value} />
          {option.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  );
}

interface PromptFilterButtonProps<S extends string, O extends string> {
  readonly active: boolean;
  readonly onClear: () => void;
  readonly onSortChange: (value: O) => void;
  readonly onStatusChange: (value: S) => void;
  readonly sort: O;
  readonly sortOptions: readonly FilterOption<O>[];
  readonly status: S;
  readonly statusOptions: readonly FilterOption<S>[];
}

export function PromptFilterButton<S extends string, O extends string>({
  active,
  onClear,
  onSortChange,
  onStatusChange,
  sort,
  sortOptions,
  status,
  statusOptions,
}: PromptFilterButtonProps<S, O>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className="relative shrink-0" size="sm" variant="outline">
            <FunnelSimpleIcon size={15} />
            Filter
            {active ? (
              <span className="absolute top-0 right-0 size-2.5 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary" />
            ) : null}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52 p-0">
        <div className="p-1">
          <FilterSection
            label="Status"
            onChange={onStatusChange}
            options={statusOptions}
            value={status}
          />
          <DropdownMenuSeparator />
          <FilterSection
            label="Sort by"
            onChange={onSortChange}
            options={sortOptions}
            value={sort}
          />
        </div>
        <DropdownMenuSeparator className="m-0" />
        <button
          className="flex w-full cursor-default items-center justify-center gap-1.5 rounded-b-lg px-2 py-1.5 text-muted-foreground text-xs hover:bg-accent hover:text-foreground"
          onClick={onClear}
          type="button"
        >
          <XIcon size={10} />
          Clear
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
