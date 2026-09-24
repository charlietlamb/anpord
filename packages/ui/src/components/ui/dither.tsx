import { useReducedMotion } from "@anpord/ui/hooks/use-reduced-motion";
import { Dithering } from "@paper-design/shaders-react";

export function Dither() {
  const still = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[90svh] opacity-[0.16] invert [mask-image:radial-gradient(ellipse_60%_50%_at_6%_0%,black,transparent_75%)] dark:opacity-[0.18] dark:invert-0"
    >
      <Dithering
        className="size-full"
        colorBack="#00000000"
        colorFront="#ffffff"
        shape="warp"
        scale={0.7}
        size={3}
        speed={still ? 0 : 0.12}
        type="4x4"
      />
    </div>
  );
}
