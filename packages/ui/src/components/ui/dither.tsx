import { DitherField } from "@anpord/ui/components/ui/dither-field";
import {
  CURRENT_DITHER,
  type DitherClumps,
  type DitherLayer,
  type DitherPreset,
} from "@anpord/ui/lib/dither-presets";
import type { CSSProperties } from "react";

const clumpsImage = ({
  cut = 7 / 12,
  edge = 12,
  frequency,
  octaves = 3,
  seed,
}: DitherClumps) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" preserveAspectRatio="none"><filter id="c" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="${octaves}" seed="${seed}"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ${edge} 0 0 0 ${-edge * cut}"/></filter><rect width="100%" height="100%" filter="url(#c)"/></svg>`
  )}")`;

const maskOf = (layer: DitherLayer): CSSProperties =>
  layer.clumps === undefined
    ? { maskImage: layer.mask, opacity: layer.opacity }
    : {
        opacity: layer.opacity,
        maskComposite: "intersect",
        maskImage: `${clumpsImage(layer.clumps)}, ${layer.mask}`,
        maskSize: "100% 100%",
      };

export function Dither({
  preset = CURRENT_DITHER,
}: {
  readonly preset?: DitherPreset;
}) {
  return (
    <div
      aria-hidden
      /* The shader only exists once WebGL has a canvas, so it cannot be
         server-rendered. Fading the layer in hides that first frame arriving
         rather than letting it snap into place. */
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[90svh] invert dark:invert-0"
      style={{
        animation: "dither-in 700ms ease-out both",
        opacity: preset.opacity,
      }}
    >
      {preset.layers.map((layer, index) => (
        <DitherField
          className="inset-0"
          key={`${preset.id}-${index}`}
          rotation={layer.rotation}
          scale={layer.scale}
          shape={layer.shape}
          size={layer.size}
          speed={layer.speed}
          style={maskOf(layer)}
          type={layer.type}
        />
      ))}
    </div>
  );
}
