import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { SideSheet } from "@/components/layout/side-sheet";

export function SetupSheet({
  children,
  description,
}: {
  readonly children: ReactNode;
  readonly description: string;
}) {
  return (
    <SideSheet
      description={description}
      title="Setup"
      trigger={
        <>
          <SlidersHorizontalIcon className="size-3.5" />
          Setup
        </>
      }
    >
      {children}
    </SideSheet>
  );
}
