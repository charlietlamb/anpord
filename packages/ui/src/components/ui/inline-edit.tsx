import { cn } from "@anpord/ui/lib/utils";
import type { KeyboardEvent } from "react";

interface InlineEditProps {
  readonly ariaLabel: string;
  readonly className?: string;
  /** Shown when the value is empty, so the field never collapses to nothing. */
  readonly placeholder?: string;
  readonly onBlur: () => void;
  readonly onChange: (value: string) => void;
  /** Abandons the edit, for Escape. */
  readonly onCancel: () => void;
  readonly value: string;
}

/**
 * A value edited where it is read. It carries no border until it is pointed
 * at, so the page shows a heading rather than a form, and the field is still
 * a real input for anyone arriving by keyboard.
 */
export function InlineEdit({
  ariaLabel,
  className,
  onBlur,
  onCancel,
  onChange,
  placeholder,
  value,
}: InlineEditProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Escape") {
      onCancel();
      event.currentTarget.blur();
    }
  };

  return (
    <input
      aria-label={ariaLabel}
      className={cn(
        "-mx-2 min-w-0 rounded-md border border-transparent bg-transparent px-2 py-0.5",
        "hover:border-border-faint focus:border-border focus:outline-none",
        "transition-colors placeholder:text-muted-foreground",
        className
      )}
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      value={value}
    />
  );
}
