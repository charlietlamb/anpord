import { useReducedMotion } from "@anpord/ui/hooks/use-reduced-motion";
import { cn } from "@anpord/ui/lib/utils";
import { Dithering, type DitheringProps } from "@paper-design/shaders-react";

type DitherFieldProps = Pick<
  DitheringProps,
  "offsetX" | "offsetY" | "scale" | "shape" | "type"
> & {
  readonly className?: string;
  readonly speed: number;
};

export function DitherField({ className, speed, ...shader }: DitherFieldProps) {
  const still = useReducedMotion();

  return (
    <div className={cn("absolute", className)}>
      <Dithering
        className="size-full"
        colorBack="#00000000"
        colorFront="#ffffff"
        size={3}
        speed={still ? 0 : speed}
        type="4x4"
        {...shader}
      />
    </div>
  );
}
