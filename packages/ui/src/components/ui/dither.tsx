"use client";

import { useEffect, useRef } from "react";
import { ditherField } from "../../lib/dither-field";
import { cn } from "../../lib/utils";

const DOT = 3;
const SECONDS_PER_FRAME = 1 / 8;
const DRIFT_RATE = 0.22;

/* The dot holds its size at every window. Growing it on a large display to
   save work changes the thing people actually see: a coarsened grid reads as a
   different texture rather than as the same one drawn cheaper. Cost is already
   bounded by SECONDS_PER_FRAME, which redraws eight times a second. */

interface DitherProps {
  readonly className?: string;
  /** Multiplies the drift, where 0 holds the field still. */
  readonly speed?: number;
}

const stillField = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Resolved by painting a pixel rather than by parsing. The colour arrives in
 * whatever space the stylesheet used, and reading the numbers out of an
 * `oklab()` as if they were rgb turns a near-white into black.
 */
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

/**
 * A Bayer-dithered field of slow waves, drawn to a canvas because the pattern
 * is thousands of dots and each one would otherwise be a node the browser has
 * to lay out.
 *
 * The field is written as pixels and blitted in one call rather than stroked a
 * rectangle at a time: at a dot per three device pixels a full screen is tens
 * of thousands of draws, which cost more than computing the field did.
 */
export function Dither({ className, speed = 1 }: DitherProps) {
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
    let time = 0;
    let mask = new Uint8Array(0);
    let image: ImageData | undefined;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(bounds.width));
      const height = Math.max(1, Math.floor(bounds.height));

      /* One canvas pixel per dot, scaled up by CSS. The pattern is dots rather
         than an image, so drawing it at device resolution would cost nine times
         as much for a grid nobody can see the edges of anyway. The dot keeps
         its size at every window: the field is the same texture on a laptop
         and on a large display. */
      columns = Math.ceil(width / DOT);
      rows = Math.ceil(height / DOT);

      if (canvas.width !== columns || canvas.height !== rows) {
        canvas.width = columns;
        canvas.height = rows;
        mask = new Uint8Array(columns * rows);
        image = context.createImageData(columns, rows);
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
      for (let index = 0; index < mask.length; index++) {
        const at = index * 4;
        const lit = mask[index];
        pixels[at] = red;
        pixels[at + 1] = green;
        pixels[at + 2] = blue;
        pixels[at + 3] = lit === 1 ? alpha : 0;
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
  }, [speed]);

  return (
    <canvas
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        /* The canvas holds one pixel per dot and CSS stretches it, so the
           browser must not smooth it back into a blur. */
        "[image-rendering:pixelated]",
        className
      )}
      ref={canvasRef}
    />
  );
}
