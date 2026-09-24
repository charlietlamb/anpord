import { DitherField } from "@anpord/ui/components/ui/dither-field";
import type { CSSProperties } from "react";

const FIELD =
  "inset-0 [mask-image:radial-gradient(ellipse_55%_50%_at_6%_22%,black,transparent_75%)]";

const DEBRIS =
  "inset-0 [mask-composite:intersect] [mask-image:var(--clumps),radial-gradient(ellipse_80%_45%_at_12%_20%,black,transparent_85%)] [mask-size:100%_100%]";

const CLUMPS = {
  "--clumps": 'url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221600%22%20height%3D%22900%22%20viewBox%3D%220%200%201600%20900%22%20preserveAspectRatio%3D%22none%22%3E%3Cfilter%20id%3D%22c%22%20x%3D%220%22%20y%3D%220%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.009%22%20numOctaves%3D%223%22%20seed%3D%2211%22%2F%3E%3CfeColorMatrix%20values%3D%220%200%200%200%201%200%200%200%200%201%200%200%200%200%201%2012%200%200%200%20-7%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23c)%22%2F%3E%3C%2Fsvg%3E")',
} as CSSProperties;

export function Dither() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[90svh] opacity-[0.16] invert dark:opacity-[0.18] dark:invert-0"
      style={CLUMPS}
    >
      <DitherField className={FIELD} scale={0.7} shape="warp" speed={0.12} />
      <DitherField className={DEBRIS} scale={0.7} shape="warp" speed={0.12} />
    </div>
  );
}
