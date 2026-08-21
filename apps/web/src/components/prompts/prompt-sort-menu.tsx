import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { ArrowsDownUpIcon, CheckIcon } from "@phosphor-icons/react";

interface SortOption<T extends string> {
  readonly label: string;
  readonly value: T;
}

interface PromptSortMenuProps<T extends string> {
  readonly onChange: (value: T) => void;
  readonly options: readonly SortOption<T>[];
  readonly value: T;
}

/**
 * How the list is ordered.
 *
 * Separate from the tabs beside it: those choose which prompts are shown, and
 * this chooses the order they arrive in. Folding both into one menu made
 * changing the view cost a trip through a setting that was not the view.
 */
export function PromptSortMenu<T extends string>({
  onChange,
  options,
  value,
}: PromptSortMenuProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Sort"
            className="size-8 shrink-0"
            size="icon-sm"
            variant="subtle"
          />
        }
      >
        <ArrowsDownUpIcon size={15} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-44">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
