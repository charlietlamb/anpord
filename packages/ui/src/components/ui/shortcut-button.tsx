import { Button } from "@anpord/ui/components/button";
import { ShortcutKeys } from "@anpord/ui/components/ui/shortcut-keys";
import { useShortcutClick } from "@anpord/ui/hooks/use-shortcut-click";
import { cn } from "@anpord/ui/lib/utils";
import type { ComponentProps } from "react";

interface ShortcutButtonProps extends ComponentProps<typeof Button> {
  metaShortcut?: string;
  singleShortcut?: string;
}

export function ShortcutButton({
  metaShortcut,
  singleShortcut,
  children,
  className,
  disabled,
  ...props
}: ShortcutButtonProps) {
  const shortcut = metaShortcut ?? singleShortcut;
  const ref = useShortcutClick<HTMLButtonElement>(shortcut, {
    disabled,
    meta: Boolean(metaShortcut),
  });

  return (
    <Button
      className={cn("gap-2", className)}
      disabled={disabled}
      ref={ref}
      {...props}
    >
      {children}
      {shortcut ? (
        <ShortcutKeys meta={Boolean(metaShortcut)} shortcut={shortcut} />
      ) : null}
    </Button>
  );
}
