import { CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@sphynx/ui/components/button";
import { cn } from "@sphynx/ui/lib/utils";
import type * as React from "react";

export function ToolbarButton({
  children,
  className,
  menu,
  ...props
}: React.ComponentProps<typeof Button> & { readonly menu?: boolean }) {
  return (
    <Button
      className={cn("text-muted-foreground", className)}
      size="sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children}
      {menu ? <CaretDownIcon className="opacity-60" /> : null}
    </Button>
  );
}
