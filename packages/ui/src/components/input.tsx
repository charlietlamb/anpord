import { Input as InputPrimitive } from "@base-ui/react/input";
import { fieldVariants } from "@sphynx/ui/lib/field";
import { cn } from "@sphynx/ui/lib/utils";
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
