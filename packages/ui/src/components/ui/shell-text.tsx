"use client";

import {
  type ShellToken,
  type ShellTokenKind,
  shellTokens,
} from "@anpord/ui/lib/highlight";
import { cn } from "@anpord/ui/lib/utils";
import { useEffect, useState } from "react";

export const SHELL_CLASSES: Record<ShellTokenKind, string> = {
  comment: "text-muted-foreground/70 italic",
  flag: "text-muted-foreground",
  operator: "text-primary",
  string: "text-foreground",
  text: "text-foreground/80",
};

export const SHELL_INVERTED: Record<ShellTokenKind, string> = {
  comment: "opacity-50 italic",
  flag: "opacity-60",
  operator: "opacity-100",
  string: "opacity-95",
  text: "opacity-80",
};

export function useShellTokens(command: string) {
  const [tokens, setTokens] = useState<{
    command: string;
    tokens: readonly ShellToken[];
  } | null>(null);

  useEffect(() => {
    let alive = true;

    shellTokens(command)
      .then((next) => {
        if (alive) {
          setTokens({ command, tokens: next });
        }
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [command]);

  return tokens?.command === command ? tokens.tokens : null;
}

export function ShellText({
  className,
  command,
  tone = "muted",
}: {
  readonly className?: string;
  readonly command: string;
  readonly tone?: "inverted" | "muted";
}) {
  const tokens = useShellTokens(command);
  const classes = tone === "inverted" ? SHELL_INVERTED : SHELL_CLASSES;

  return (
    <span className={cn("skeleton:skeleton-block font-mono", className)}>
      {tokens === null
        ? command
        : tokens.map((token, index) => (
            <span
              className={classes[token.kind]}
              key={`${index}-${token.value}`}
            >
              {token.value}
            </span>
          ))}
    </span>
  );
}
