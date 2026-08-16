"use client";

import { useEffect, useRef } from "react";
import { ditherField } from "../../lib/dither-field";
import { cn } from "../../lib/utils";

const DOT = 3;
const SECONDS_PER_FRAME = 1 / 8;
const DRIFT_RATE = 0.22;

interface DitherProps {
  readonly className?: string;
  /** Multiplies the drift, where 0 holds the field still. */
  readonly speed?: number;
}

const stillField = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A Bayer-dithered field of slow waves, drawn to a canvas because the pattern
 * is thousands of dots and each one would otherwise be a node the browser has
 * to lay out.
 */
export function Dither({ className, speed = 1 }: DitherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!(canvas && context)) {
      return;
    }

    const still = stillField();
    let frame = 0;
    let time = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio ?? 1;
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(bounds.width));
      height = Math.max(1, Math.floor(bounds.height));
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const paint = () => {
      const columns = Math.ceil(width / DOT);
      const rows = Math.ceil(height / DOT);

      context.clearRect(0, 0, width, height);
      context.fillStyle = getComputedStyle(canvas).color;

      for (const cell of ditherField(columns, rows, time)) {
        context.fillRect(cell.column * DOT, cell.row * DOT, 1, 1);
      }
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
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      ref={canvasRef}
    />
  );
}
