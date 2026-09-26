import type { EvalSuite } from "@anpord/schema/domain/evals";
import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { cn } from "@anpord/ui/lib/utils";
import {
  CaretRightIcon,
  CheckIcon,
  FunnelSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";

interface Choice {
  readonly label: string;
  readonly value: string;
}

function FilterGroup({
  choices,
  label,
  onSelect,
  selected,
}: {
  readonly choices: readonly Choice[];
  readonly label: string;
  readonly onSelect: (value: string | null) => void;
  readonly selected: string | null;
}) {
  if (choices.length === 0) {
    return null;
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="justify-between">
        <span className="flex items-center gap-2">
          {label}
          {selected === null ? null : (
            <span className="truncate text-muted-foreground text-xs">
              {choices.find((choice) => choice.value === selected)?.label}
            </span>
          )}
        </span>
        <CaretRightIcon className="size-3.5 text-muted-foreground" />
      </DropdownMenuSubTrigger>

      <DropdownMenuSubContent className="max-h-72 min-w-52">
        <DropdownMenuItem onClick={() => onSelect(null)}>
          <CheckIcon className={selected === null ? undefined : "invisible"} />
          Any
        </DropdownMenuItem>
        {choices.map((choice) => (
          <DropdownMenuItem
            key={choice.value}
            onClick={() => onSelect(choice.value)}
          >
            <CheckIcon
              className={choice.value === selected ? undefined : "invisible"}
            />
            <span className="truncate">{choice.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

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
    <DropdownMenu>
      <DropdownMenuTrigger
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
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-48">
        <FilterGroup
          choices={suites.map((entry) => ({
            label: entry.name,
            value: entry.id,
          }))}
          label="Suite"
          onSelect={onSuite}
          selected={suite}
        />
        <FilterGroup
          choices={tags.map((entry) => ({ label: entry, value: entry }))}
          label="Tag"
          onSelect={onTag}
          selected={tag}
        />

        {active > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClear}>
              <XIcon />
              Clear filters
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
