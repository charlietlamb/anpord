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
import {
  ArrowsDownUpIcon,
  CheckIcon,
  SortAscendingIcon,
  SortDescendingIcon,
} from "@phosphor-icons/react";

type SortDirection = "asc" | "desc";

interface SortOption<T extends string> {
  readonly label: string;
  readonly value: T;
}

interface SortMenuProps<T extends string> {
  readonly direction?: SortDirection;
  readonly onChange: (value: T) => void;
  readonly onDirection?: (value: SortDirection) => void;
  readonly options: readonly SortOption<T>[];
  readonly value: T;
}

const DIRECTIONS: readonly {
  readonly icon: typeof SortAscendingIcon;
  readonly label: string;
  readonly value: SortDirection;
}[] = [
  { icon: SortDescendingIcon, label: "Descending", value: "desc" },
  { icon: SortAscendingIcon, label: "Ascending", value: "asc" },
];

export function SortMenu<T extends string>({
  direction,
  onChange,
  onDirection,
  options,
  value,
}: SortMenuProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Sort"
            className="rounded-md"
            size="icon-sm"
            variant="subtle"
          />
        }
      >
        <ArrowsDownUpIcon />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onChange(option.value)}
            >
              <CheckIcon
                className={option.value === value ? undefined : "invisible"}
              />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        {direction === undefined || onDirection === undefined ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Order</DropdownMenuLabel>
              {DIRECTIONS.map((entry) => (
                <DropdownMenuItem
                  key={entry.value}
                  onClick={() => onDirection(entry.value)}
                >
                  <CheckIcon
                    className={
                      entry.value === direction ? undefined : "invisible"
                    }
                  />
                  <entry.icon />
                  {entry.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
