import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Badge } from "@anpord/ui/components/ui/badge";
import { cn, SPIN } from "@anpord/ui/lib/utils";

export type StatusTone = "destructive" | "pending" | "positive" | "secondary";

export function StatusBadge({
  children,
  className,
  icon: Glyph,
  size = "sm",
  spin = false,
  tone = "secondary",
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly icon: Icon;
  readonly size?: "sm" | "xs";
  readonly spin?: boolean;
  readonly tone?: StatusTone;
}) {
  return (
    <Badge className={className} size={size} variant={tone}>
      {/* A filled notch is a solid disc, so its turning cannot be seen. */}
      <Glyph
        aria-hidden="true"
        className={cn(spin && SPIN)}
        weight={spin ? "bold" : "fill"}
      />
      {children}
    </Badge>
  );
}
