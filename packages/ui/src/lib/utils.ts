import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* Every spinner honours reduced motion, so the pair travels together. */
export const SPIN = "animate-spin motion-reduce:animate-none";
