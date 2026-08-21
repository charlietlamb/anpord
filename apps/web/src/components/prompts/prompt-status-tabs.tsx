import { cn } from "@anpord/ui/lib/utils";

interface StatusOption<T extends string> {
  readonly label: string;
  readonly value: T;
}

interface PromptStatusTabsProps<T extends string> {
  readonly onChange: (value: T) => void;
  readonly options: readonly StatusOption<T>[];
  readonly value: T;
}

/**
 * Which prompts the page is showing, as the views themselves rather than as a
 * setting to open first.
 *
 * There are three of them and they are mutually exclusive, which is a row of
 * tabs. Behind a menu, switching view costs two clicks and the current one is
 * only legible once the menu is open.
 */
export function PromptStatusTabs<T extends string>({
  onChange,
  options,
  value,
}: PromptStatusTabsProps<T>) {
  return (
    <div className="flex shrink-0 items-center gap-1" role="tablist">
      {options.map((option) => (
        <button
          aria-selected={option.value === value}
          className={cn(
            "h-7 cursor-default rounded-md px-2.5 font-medium text-xs transition-colors",
            option.value === value
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
          key={option.value}
          onClick={() => onChange(option.value)}
          role="tab"
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
