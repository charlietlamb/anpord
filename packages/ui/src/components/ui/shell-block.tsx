import { CodeBlock } from "@anpord/ui/components/ui/code-block";
import { cn } from "@anpord/ui/lib/utils";
import {
  SHELL_CLASSES,
  SHELL_INVERTED,
} from "@anpord/ui/components/ui/shell-text";
import { shellTokens } from "@anpord/ui/lib/shell-tokens";

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
  const classes = tone === "inverted" ? SHELL_INVERTED : SHELL_CLASSES;

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
