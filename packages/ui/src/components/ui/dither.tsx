import { DitherField } from "@anpord/ui/components/ui/dither-field";

const SPECKS =
  "inset-0 [mask-image:radial-gradient(circle_5svh_at_86%_16%,black,transparent),radial-gradient(circle_3svh_at_62%_9%,black,transparent),radial-gradient(circle_6svh_at_93%_52%,black,transparent),radial-gradient(circle_3svh_at_80%_80%,black,transparent),radial-gradient(circle_4svh_at_52%_88%,black,transparent),radial-gradient(circle_2svh_at_30%_12%,black,transparent),radial-gradient(circle_3svh_at_97%_88%,black,transparent),radial-gradient(circle_2svh_at_84%_66%,black,transparent)]";

const RING =
  "top-[16svh] -left-[25svh] h-[10svh] w-[50svh] sm:top-[43svh] sm:-left-[36svh] sm:h-[14svh] sm:w-[72svh] -rotate-[18deg] [mask-image:radial-gradient(closest-side,transparent_58%,black_68%,black_88%,transparent_100%)]";

export function Dither() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-svh overflow-hidden opacity-[0.16] invert dark:opacity-[0.2] dark:invert-0"
    >
      <DitherField
        className={SPECKS}
        scale={0.5}
        shape="simplex"
        speed={0.05}
      />
      <DitherField
        className="top-[6svh] -left-[15svh] size-[30svh] sm:top-[28svh] sm:-left-[22svh] sm:size-[44svh]"
        shape="sphere"
        speed={0.08}
      />
      <DitherField className={RING} scale={0.4} shape="simplex" speed={0.1} />
    </div>
  );
}
