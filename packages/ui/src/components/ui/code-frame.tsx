import type { ReactNode } from "react";
import {
  SURFACE_BODY,
  SURFACE_FRAME,
  SURFACE_HEAD,
} from "@anpord/ui/lib/surface";
import { cn } from "@anpord/ui/lib/utils";

export const CODE_FRAME_ACTION =
  "shrink-0 opacity-0 transition-opacity duration-150 ease-out focus-visible:opacity-100 group-hover/code:opacity-100";

export function CodeFrame({
  actions,
  children,
  className,
  icon,
  label,
}: {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly icon?: ReactNode;
  readonly label: string;
}) {
  return (
    <div className={cn("group/code", SURFACE_FRAME, className)}>
      <div className={cn(SURFACE_HEAD, "flex items-center gap-2 pr-1 pl-3")}>
        {icon}
        <span className="min-w-0 flex-1 truncate font-mono">{label}</span>
        {actions}
      </div>
      <div className={SURFACE_BODY}>{children}</div>
    </div>
  );
}
