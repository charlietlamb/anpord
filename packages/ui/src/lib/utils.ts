import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/* The theme adds these font sizes; without them a text colour beside one reads as a conflict and drops it. */
const merge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["2xs", "3xs", "label"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}

/* Every spinner honours reduced motion, so the pair travels together. */
export const SPIN = "animate-spin motion-reduce:animate-none";
