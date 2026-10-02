import { DotsThreeIcon } from "@phosphor-icons/react";
import { Button } from "@sphynx/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@sphynx/ui/components/dropdown-menu";
import { cn } from "@sphynx/ui/lib/utils";
import type { ReactNode } from "react";

export function RowActionsMenu({
  children,
  className,
  label,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly label: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={label}
            className={cn("relative", className)}
            size="icon-xs"
            variant="bare"
          />
        }
      >
        <DotsThreeIcon />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-44">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
