import {
  ClaudeMark,
  CloudflareMark,
  CursorMark,
  DaytonaMark,
  E2bMark,
  ModalMark,
  OpenAiMark,
  OpencodeMark,
  UpstashMark,
  VercelMark,
} from "@anpord/ui/components/brand/provider-marks";
import { ShortcutKeys } from "@anpord/ui/components/ui/shortcut-keys";
import { useShortcutClick } from "@anpord/ui/hooks/use-shortcut-click";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { GaugeIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { GithubIcon } from "@/components/icons/github-icon";
import { type Vendor, VendorMarks } from "@/components/landing/vendor-marks";
import { SiteLayout } from "@/components/layout/site-layout";
import { REPO_URL } from "@/lib/urls";

const HARNESSES: readonly Vendor[] = [
  {
    Mark: OpenAiMark,
    href: "https://developers.openai.com/codex",
    name: "Codex",
  },
  {
    Mark: ClaudeMark,
    href: "https://claude.com/product/claude-code",
    name: "Claude Code",
  },
  { Mark: CursorMark, href: "https://cursor.com", name: "Cursor" },
  { Mark: OpencodeMark, href: "https://opencode.ai", name: "opencode" },
];

const SANDBOXES: readonly Vendor[] = [
  { Mark: E2bMark, href: "https://e2b.dev", name: "E2B" },
  { Mark: DaytonaMark, href: "https://daytona.io", name: "Daytona" },
  {
    Mark: UpstashMark,
    href: "https://upstash.com/docs/box",
    name: "Upstash Box",
  },
  { Mark: ModalMark, href: "https://modal.com", name: "Modal" },
  {
    Mark: CloudflareMark,
    href: "https://developers.cloudflare.com/sandbox",
    name: "Cloudflare",
  },
  {
    Mark: VercelMark,
    href: "https://vercel.com/docs/vercel-sandbox",
    name: "Vercel",
  },
];

const REVEAL =
  "fade-in-0 slide-in-from-bottom-2 animate-in fill-mode-both ease-out [animation-duration:500ms]";

export function Landing() {
  const start = useShortcutClick<HTMLAnchorElement>("enter", { meta: true });

  return (
    <SiteLayout>
      <section className="flex flex-1 flex-col justify-center pb-24">
        <h1
          className={cn(
            REVEAL,
            "text-balance font-heading font-medium text-5xl tracking-tight sm:text-6xl"
          )}
        >
          Evals for Claude&nbsp;Code and Codex.
        </h1>
        <p
          className={cn(
            REVEAL,
            "mt-5 max-w-lg text-balance text-muted-foreground [animation-delay:75ms] sm:text-lg"
          )}
        >
          Easily run evals across different sandboxes, harnesses and models to
          optimize performance, latency and costs.
        </p>
        <div
          className={cn(
            REVEAL,
            "mt-8 flex flex-wrap items-center gap-3 [animation-delay:150ms]"
          )}
        >
          <Link
            className={buttonVariants({ size: "lg" })}
            ref={start}
            to="/login"
          >
            <GaugeIcon />
            Start optimizing
            <ShortcutKeys meta shortcut="enter" />
          </Link>
          <a
            className={buttonVariants({ size: "lg", variant: "outline" })}
            href={REPO_URL}
            rel="noreferrer"
            target="_blank"
          >
            <GithubIcon />
            View source
          </a>
        </div>

        <p
          className={cn(
            REVEAL,
            "mt-9 flex flex-wrap items-center gap-x-2.5 gap-y-3 text-muted-foreground text-sm [animation-delay:225ms]"
          )}
        >
          <span>Works with</span>
          <VendorMarks items={HARNESSES} />
          <span>across</span>
          <VendorMarks items={SANDBOXES} />
        </p>
      </section>
    </SiteLayout>
  );
}
