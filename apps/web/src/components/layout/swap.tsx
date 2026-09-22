import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";
import { RISE } from "@/lib/motion";

export function Swap({
  children,
  className,
  swapKey,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly swapKey: string;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div className={className} key={swapKey} {...RISE}>
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
