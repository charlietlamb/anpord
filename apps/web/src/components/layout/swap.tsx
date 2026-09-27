import { AnimatePresence, LazyMotion, MotionConfig } from "motion/react";
import { div as MotionDiv } from "motion/react-m";
import type { ReactNode } from "react";
import { RISE } from "@/lib/motion";

const features = () =>
  import("@/lib/motion-features").then((module) => module.animationFeatures);

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
    <LazyMotion features={features}>
      <MotionConfig reducedMotion="user">
        <AnimatePresence initial={false} mode="popLayout">
          <MotionDiv className={className} key={swapKey} {...RISE}>
            {children}
          </MotionDiv>
        </AnimatePresence>
      </MotionConfig>
    </LazyMotion>
  );
}
