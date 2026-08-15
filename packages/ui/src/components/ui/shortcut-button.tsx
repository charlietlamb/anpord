import { Button } from "@anpord/ui/components/button";
import { Kbd } from "@anpord/ui/components/ui/kbd";
import { cn } from "@anpord/ui/lib/utils";
import { isMac, useShortcut } from "@anpord/ui/hooks/use-shortcut";
import type { ComponentProps } from "react";

interface ShortcutButtonProps extends ComponentProps<typeof Button> {
  metaShortcut?: string;
  singleShortcut?: string;
}

const SHORTCUT_GLYPHS: Record<string, string> = {
  enter: "↵",
  backspace: "⌫",
  escape: "Esc",
};

function shortcutGlyph(key: string) {
  return SHORTCUT_GLYPHS[key] ?? key.toUpperCase();
}

// biome-ignore lint/suspicious/noExplicitAny: keyboard-triggered click has no real DOM event
const SYNTHETIC_CLICK = { preventBaseUIHandler: () => undefined } as any;

/** Filled variants need their own cap contrast; ghost ones inherit the text. */
const FILLED_CAPS = "border-white/20 bg-white/16 text-white/80";

export function ShortcutButton({
  metaShortcut,
  singleShortcut,
  children,
  className,
  disabled,
  onClick,
  variant,
  ...props
}: ShortcutButtonProps) {
  const key = metaShortcut ?? singleShortcut;
  const capClass =
    variant === undefined || variant === "default" || variant === "destructive"
      ? FILLED_CAPS
      : undefined;

  useShortcut(key ?? "", {
    meta: Boolean(metaShortcut),
    disabled: disabled || !key,
    onTrigger: () => onClick?.(SYNTHETIC_CLICK),
  });

  return (
    <Button
      className={cn("gap-2", className)}
      disabled={disabled}
      onClick={onClick}
      variant={variant}
      {...props}
    >
      {children}
      {key ? (
        <span className="flex items-center gap-0.5">
          {metaShortcut ? (
            <Kbd className={capClass}>{isMac() ? "⌘" : "Ctrl"}</Kbd>
          ) : null}
          <Kbd className={capClass}>{shortcutGlyph(key)}</Kbd>
        </span>
      ) : null}
    </Button>
  );
}
