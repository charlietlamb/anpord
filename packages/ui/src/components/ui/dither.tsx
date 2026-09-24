import { DitherField } from "@anpord/ui/components/ui/dither-field";

const FIELD =
  "inset-0 [mask-image:radial-gradient(ellipse_55%_50%_at_6%_22%,black,transparent_75%)]";

const DEBRIS =
  "inset-0 [mask-image:radial-gradient(circle_3svh_at_30%_12%,black,transparent),radial-gradient(circle_2.4svh_at_38%_6%,black,transparent),radial-gradient(circle_2svh_at_48%_15%,black,transparent),radial-gradient(circle_1.6svh_at_59%_7%,black,transparent),radial-gradient(circle_1.3svh_at_70%_13%,black,transparent),radial-gradient(circle_1svh_at_81%_6%,black,transparent),radial-gradient(circle_0.8svh_at_91%_14%,black,transparent),radial-gradient(circle_2.4svh_at_12%_62%,black,transparent),radial-gradient(circle_1.6svh_at_7%_76%,black,transparent),radial-gradient(circle_1svh_at_15%_88%,black,transparent)]";

export function Dither() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[90svh] opacity-[0.16] invert dark:opacity-[0.18] dark:invert-0"
    >
      <DitherField className={FIELD} scale={0.7} shape="warp" speed={0.12} />
      <DitherField className={DEBRIS} scale={0.7} shape="warp" speed={0.12} />
    </div>
  );
}
