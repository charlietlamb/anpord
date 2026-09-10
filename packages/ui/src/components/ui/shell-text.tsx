import { type ShellTokenKind, shellTokens } from "@anpord/ui/lib/shell-tokens";
import { cn } from "@anpord/ui/lib/utils";

/**
 * Weight and contrast rather than hue.
 *
 * The theme is near-monochrome and spends colour on meaning: primary for what
 * acts, success and warning for what happened. A palette of violet flags and
 * green strings would be the loudest thing on a screen where a failed command
 * is the only thing that should be loud.
 *
 * So a command is separated the way prose is: the parts that carry it sit at
 * full contrast, the scaffolding recedes, and the one hue is the operator,
 * which is what a reader traces to see where one stage hands to the next.
 */
export const SHELL_CLASSES: Record<ShellTokenKind, string> = {
  comment: "text-muted-foreground/70 italic",
  flag: "text-muted-foreground",
  operator: "text-primary",
  string: "text-foreground",
  text: "text-foreground/80",
};

/* On an inverted surface the theme's own tokens are the wrong way round, so
   the scale is drawn from the container's text colour instead. */
export const SHELL_INVERTED: Record<ShellTokenKind, string> = {
  comment: "opacity-50 italic",
  flag: "opacity-60",
  operator: "opacity-100",
  string: "opacity-95",
  text: "opacity-80",
};

/** The same separation as ShellBlock, for a command that sits in a row rather
 * than on its own ground. */
export function ShellText({
  className,
  command,
  tone = "muted",
}: {
  readonly className?: string;
  readonly command: string;
  readonly tone?: "inverted" | "muted";
}) {
  const classes = tone === "inverted" ? SHELL_INVERTED : SHELL_CLASSES;

  return (
    <span className={cn("font-mono", className)}>
      {shellTokens(command).map((token, index) => (
        <span className={classes[token.kind]} key={`${index}-${token.value}`}>
          {token.value}
        </span>
      ))}
    </span>
  );
}
