"use client";

import { useEffect, useRef } from "react";
import { ditherField } from "../../lib/dither-field";
import { cn } from "../../lib/utils";

const DOT = 3;
const SECONDS_PER_FRAME = 1 / 8;
const DRIFT_RATE = 0.22;

interface DitherProps {
  readonly className?: string;
  readonly dot?: number;
  readonly speed?: number;
}

const stillField = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const channels = (colour: string) => {
  const probe = document.createElement("canvas");
  probe.width = 1;
  probe.height = 1;

  const context = probe.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return { alpha: 255, blue: 0, green: 0, red: 0 };
  }

  context.fillStyle = colour;
  context.fillRect(0, 0, 1, 1);

  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return { alpha, blue, green, red };
};

export function Dither({ className, dot = DOT, speed = 1 }: DitherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!(canvas && context)) {
      return;
    }

    const still = stillField();
    let frame = 0;
    let columns = 0;
    let rows = 0;
    let ratio = 1;
    let spacing = DOT;
    let surfaceWidth = 0;
    let surfaceHeight = 0;
    let time = 0;
    let mask = new Uint8Array(0);
    let image: ImageData | undefined;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(bounds.width));
      const height = Math.max(1, Math.floor(bounds.height));

      ratio = window.devicePixelRatio ?? 1;
      const step = Math.max(1, Math.round(dot * ratio));

      surfaceWidth = Math.max(1, Math.round(width * ratio));
      surfaceHeight = Math.max(1, Math.round(height * ratio));
      columns = Math.ceil(surfaceWidth / step);
      rows = Math.ceil(surfaceHeight / step);
      spacing = step;

      if (canvas.width !== surfaceWidth || canvas.height !== surfaceHeight) {
        canvas.width = surfaceWidth;
        canvas.height = surfaceHeight;
        mask = new Uint8Array(columns * rows);
        image = context.createImageData(surfaceWidth, surfaceHeight);
      }
    };

    const paint = () => {
      if (!image || columns === 0 || rows === 0) {
        return;
      }

      const { alpha, blue, green, red } = channels(
        getComputedStyle(canvas).color
      );

      ditherField(mask, columns, rows, time);

      const pixels = image.data;
      pixels.fill(0);

      for (let row = 0; row < rows; row++) {
        const y = row * spacing;
        if (y >= surfaceHeight) {
          break;
        }

        const maskRow = row * columns;
        const pixelRow = y * surfaceWidth;

        for (let column = 0; column < columns; column++) {
          if (mask[maskRow + column] !== 1) {
            continue;
          }

          const x = column * spacing;
          if (x >= surfaceWidth) {
            break;
          }

          const at = (pixelRow + x) * 4;
          pixels[at] = red;
          pixels[at + 1] = green;
          pixels[at + 2] = blue;
          pixels[at + 3] = alpha;
        }
      }

      context.putImageData(image, 0, 0);
    };

    const tick = () => {
      time += SECONDS_PER_FRAME * DRIFT_RATE * speed;
      paint();
      frame = window.setTimeout(
        () => requestAnimationFrame(tick),
        SECONDS_PER_FRAME * 1000
      );
    };

    resize();
    paint();

    if (!still) {
      tick();
    }

    const observer = new ResizeObserver(() => {
      resize();
      paint();
    });
    observer.observe(canvas);

    return () => {
      window.clearTimeout(frame);
      observer.disconnect();
    };
  }, [dot, speed]);

  return (
    <canvas
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className
      )}
      ref={canvasRef}
    />
  );
}
