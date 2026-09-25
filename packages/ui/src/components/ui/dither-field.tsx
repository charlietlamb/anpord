import { useReducedMotion } from "@anpord/ui/hooks/use-reduced-motion";
import { cn } from "@anpord/ui/lib/utils";
import { Dithering, type DitheringProps } from "@paper-design/shaders-react";
import type { CSSProperties } from "react";

type DitherFieldProps = Pick<
  DitheringProps,
  "offsetX" | "offsetY" | "rotation" | "scale" | "shape" | "size" | "type"
> & {
  readonly className?: string;
  readonly speed: number;
  readonly style?: CSSProperties;
};

export function DitherField({
  className,
  speed,
  style,
  ...shader
}: DitherFieldProps) {
  const still = useReducedMotion();

  return (
    <div className={cn("absolute", className)} style={style}>
      <Dithering
        className="size-full"
        colorBack="#00000000"
        colorFront="#ffffff"
        speed={still ? 0 : speed}
        {...shader}
        size={shader.size ?? 3}
        type={shader.type ?? "4x4"}
      />
    </div>
  );
}
