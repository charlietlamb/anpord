import { cn } from "@anpord/ui/lib/utils";
import type { KeyboardEvent } from "react";

interface InlineEditProps {
  readonly ariaLabel: string;
  readonly className?: string;
  readonly placeholder?: string;
  readonly onBlur: () => void;
  readonly onChange: (value: string) => void;
  readonly onCancel: () => void;
  readonly value: string;
}

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
        "min-w-0 rounded-sm border-0 bg-transparent p-0 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "placeholder:text-muted-foreground",
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
