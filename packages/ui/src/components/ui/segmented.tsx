import { Button } from "@anpord/ui/components/button";
import { cn } from "@anpord/ui/lib/utils";

/**
 * A small set of mutually exclusive choices, shown all at once.
 *
 * For two or three short options where seeing the alternatives is the point:
 * a package manager, a workspace kind. A select hides them behind a click,
 * which is the wrong trade when the whole set fits on one line.
 */
export function Segmented<T extends string>({
  className,
  onChange,
  options,
  value,
}: {
  readonly className?: string;
  readonly onChange: (value: T) => void;
  readonly options: readonly { readonly label: string; readonly value: T }[];
  readonly value: T;
}) {
  return (
    <div
      className={cn(
        "flex w-fit gap-1 rounded-md border border-border-faint p-0.5",
        className
      )}
    >
      {options.map((option) => (
        <Button
          className={cn(
            "h-7 px-2.5 text-xs",
            option.value === value && "bg-alpha-8 text-foreground"
          )}
          key={option.value}
          onClick={() => onChange(option.value)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
