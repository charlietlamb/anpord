import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Badge } from "@anpord/ui/components/ui/badge";

export type StatusTone = "destructive" | "pending" | "positive" | "secondary";

export function StatusBadge({
  children,
  className,
  icon: Glyph,
  size = "sm",
  tone = "secondary",
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly icon: Icon;
  readonly size?: "sm" | "xs";
  readonly tone?: StatusTone;
}) {
  return (
    <Badge className={className} size={size} variant={tone}>
      <Glyph aria-hidden="true" weight="fill" />
      {children}
    </Badge>
  );
}
