const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export const RISE = {
  animate: { opacity: 1, transform: "translateY(0px)" },
  exit: { opacity: 0, transition: { duration: 0.1 } },
  initial: { opacity: 0, transform: "translateY(4px)" },
  transition: { duration: 0.18, ease: EASE_OUT },
} as const;
