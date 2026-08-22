import { CodeBlock } from "@anpord/ui/components/ui/code-block";
import { cn } from "@anpord/ui/lib/utils";
import { type ShellTokenKind, shellTokens } from "@anpord/ui/lib/shell-tokens";

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
const CLASSES: Record<ShellTokenKind, string> = {
  comment: "text-muted-foreground/70 italic",
  flag: "text-muted-foreground",
  operator: "text-primary",
  string: "text-foreground",
  text: "text-foreground/80",
};

/* On an inverted surface the theme's own tokens are the wrong way round, so
   the scale is drawn from the container's text colour instead. */
const INVERTED: Record<ShellTokenKind, string> = {
  comment: "opacity-50 italic",
  flag: "opacity-60",
  operator: "opacity-100",
  string: "opacity-95",
  text: "opacity-80",
};

export function ShellBlock({
  className,
  command,
  copyable = true,
  tone = "muted",
}: {
  readonly className?: string;
  readonly command: string;
  /** Off inside a tooltip: it closes when the pointer leaves its trigger, so
   * a control within it can never be reached. */
  readonly copyable?: boolean;
  readonly tone?: "inverted" | "muted" | "plain";
}) {
  const classes = tone === "inverted" ? INVERTED : CLASSES;

  return (
    <CodeBlock
      className={cn("break-all", className)}
      copyValue={copyable ? command : undefined}
      tone={tone}
    >
      {shellTokens(command).map((token, index) => (
        <span className={classes[token.kind]} key={`${index}-${token.value}`}>
          {token.value}
        </span>
      ))}
    </CodeBlock>
  );
}
