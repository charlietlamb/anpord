import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { DetailRowFrame } from "@/components/prompts/detail-row-frame";

interface DetailRowProps {
  readonly children: ReactNode;
  /** Stands in for the label, which is only needed by a screen reader once the
   * icon carries the meaning on screen. */
  readonly icon: Icon;
  readonly label: string;
}

/** A property named by an icon. */
export function DetailRow({
  children,
  icon: PropertyIcon,
  label,
}: DetailRowProps) {
  return (
    <DetailRowFrame
      label={label}
      marker={
        <PropertyIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
          weight="bold"
        />
      }
    >
      {children}
    </DetailRowFrame>
  );
}
