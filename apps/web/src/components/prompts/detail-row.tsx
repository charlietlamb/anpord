import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { DetailRowFrame } from "@/components/prompts/detail-row-frame";

interface DetailRowProps {
  readonly children: ReactNode;

  readonly icon: Icon;
  readonly label: string;
}

export function DetailRow({
  children,
  icon: PropertyIcon,
  label,
}: DetailRowProps) {
  return (
    <DetailRowFrame
      label={label}
      marker={<PropertyIcon aria-hidden="true" className="size-4 shrink-0" />}
    >
      {children}
    </DetailRowFrame>
  );
}
