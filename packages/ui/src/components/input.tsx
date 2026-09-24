import { fieldVariants } from "@anpord/ui/lib/field";
import { cn } from "@anpord/ui/lib/utils";
import { Input as InputPrimitive } from "@base-ui/react/input";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

export function Input({
  className,
  size,
  ...props
}: Omit<React.ComponentProps<typeof InputPrimitive>, "size"> &
  VariantProps<typeof fieldVariants>) {
  return (
    <InputPrimitive
      className={cn(fieldVariants({ size }), className)}
      {...props}
    />
  );
}
