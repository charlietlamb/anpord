import { Dither } from "@sphynx/ui/components/ui/dither";
import {
  type DitherPreset,
  LANDING_DITHER,
} from "@sphynx/ui/lib/dither-presets";
import type { HeaderPreset } from "@sphynx/ui/lib/header-presets";
import { cn } from "@sphynx/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { CopyCommand } from "@/components/landing/copy-command";
import { LandingNav } from "@/components/landing/landing-nav";
import { SiteHeader } from "@/components/layout/site-header";

export function Landing({
  dither = LANDING_DITHER,
  header,
}: {
  readonly dither?: DitherPreset;
  readonly header?: HeaderPreset;
}) {
  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-background text-foreground">
      <Dither preset={dither} />
      {header === undefined ? <LandingNav /> : <SiteHeader preset={header} />}
      <section className="absolute inset-x-6 bottom-16 flex flex-col gap-8 lg:inset-x-[72px] lg:bottom-[88px] lg:flex-row lg:items-end lg:justify-between lg:gap-12">
        <h1
          className={cn(
            "max-w-[760px] text-pretty font-light text-[40px] leading-[44px] tracking-[-0.04em] lg:text-[64px] lg:leading-[66px] lg:tracking-[-0.045em]"
          )}
        >
          Reinforcement learning for your product.
        </h1>
        <div className="flex w-full max-w-[380px] shrink-0 flex-col gap-5 lg:pb-1.5">
          <p className="max-w-[372px] font-light text-[16px] text-muted-foreground leading-6">
            Run agents on real tasks, reward what works, and fix what
            doesn&rsquo;t.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              className="flex h-9 items-center rounded-[4px] bg-foreground px-4 font-[450] text-[14px] text-background transition-opacity duration-150 hover:opacity-85"
              to="/login"
            >
              Start optimizing
            </Link>
            <CopyCommand />
          </div>
        </div>
      </section>
    </main>
  );
}
