import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { CopyAgentSetup } from "@/components/landing/copy-agent-setup";
import { SiteLayout } from "@/components/layout/site-layout";

const REVEAL =
  "fade-in-0 slide-in-from-bottom-2 animate-in fill-mode-both ease-out [animation-duration:500ms]";

export function Landing() {
  return (
    <SiteLayout>
      <section className="flex flex-1 flex-col justify-center pb-24">
        <h1
          className={cn(
            REVEAL,
            "max-w-3xl text-pretty font-heading text-3xl leading-[1.15] tracking-tight sm:text-5xl"
          )}
        >
          Reinforcement learning for your product.{" "}
          <span className="text-muted-foreground">
            Run agents on real tasks, reward what works, and fix what
            doesn&rsquo;t.
          </span>
        </h1>
        <div
          className={cn(
            REVEAL,
            "mt-10 flex flex-wrap items-center gap-2 [animation-delay:100ms]"
          )}
        >
          <Link
            className={cn(buttonVariants({ size: "xl" }), "group/start")}
            to="/login"
          >
            Get started
            <span
              aria-hidden
              className="transition-transform duration-150 ease-out group-hover/start:translate-x-0.5"
            >
              →
            </span>
          </Link>
          <CopyAgentSetup />
        </div>
      </section>
    </SiteLayout>
  );
}
