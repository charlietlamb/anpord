import {
  AnthropicMark,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { Kbd } from "@anpord/ui/components/ui/kbd";
import { isMac, useShortcut } from "@anpord/ui/hooks/use-shortcut";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { FlaskIcon } from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { GithubIcon } from "@/components/icons/github-icon";
import { SiteLayout } from "@/components/layout/site-layout";
import { REPO_URL } from "@/lib/urls";
import { useIsClient } from "@/lib/use-is-client";

const CAP = "border-white/20 bg-white/16 text-white/80";

interface Vendor {
  readonly href: string;
  readonly Mark: (props: { readonly className?: string }) => React.ReactElement;
  readonly name: string;
}

const HARNESSES: readonly Vendor[] = [
  {
    Mark: OpenAiMark,
    href: "https://developers.openai.com/codex",
    name: "Codex",
  },
  {
    Mark: AnthropicMark,
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

/**
 * The vendors a phrase covers, as their own marks.
 *
 * No ring around each one: a vendor mark is already a recognisable shape, and
 * a bordered circle drew the eye to the container rather than to what it held.
 * No overlap either -- stacking is an avatar idiom meaning "more of these than
 * you need to count", which is the wrong claim about ten named vendors.
 *
 * Names are left to the tooltip. Written out they came to fifty-two characters
 * for the sandboxes alone, which is a paragraph rather than the quiet line a
 * hero ends on, and the sentence around them already says what each group is.
 */
function MarkRow({ items }: { readonly items: readonly Vendor[] }) {
  return (
    <span className="inline-flex items-center gap-2">
      {items.map(({ Mark, href, name }) => (
        <Tooltip key={name}>
          <TooltipTrigger
            render={
              <a
                className={cn(
                  "rounded-sm text-muted-foreground/80",
                  "transition-colors duration-200 ease-out hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                href={href}
                rel="noreferrer"
                target="_blank"
              >
                {/* Inside the anchor, not beside it: the trigger renders the
                    element it is given and drops its own children, so a mark
                    passed as a child left a row of empty circles. */}
                <Mark className="size-4 shrink-0" />
                <span className="sr-only">{name}</span>
              </a>
            }
          />
          <TooltipContent>{name}</TooltipContent>
        </Tooltip>
      ))}
    </span>
  );
}

export function Landing() {
  const navigate = useNavigate();
  useShortcut("enter", {
    meta: true,
    onTrigger: () => navigate({ to: "/login" }),
  });
  const isClient = useIsClient();

  return (
    <SiteLayout dot={4}>
      <section className="flex flex-1 flex-col justify-center pb-24">
        <h1 className="fade-in-0 slide-in-from-bottom-2 animate-in text-balance fill-mode-both font-heading text-5xl tracking-tight ease-out [animation-duration:500ms] sm:text-6xl">
          Evals for harnesses running in sandboxes.
        </h1>
        <p className="fade-in-0 slide-in-from-bottom-2 mt-5 max-w-lg animate-in text-balance fill-mode-both text-muted-foreground ease-out [animation-delay:75ms] [animation-duration:500ms] sm:text-lg">
          Easily run evals across different sandboxes, harnesses and models to
          optimize performance, latency and costs.
        </p>
        <div className="fade-in-0 slide-in-from-bottom-2 mt-8 flex animate-in flex-wrap items-center gap-3 fill-mode-both ease-out [animation-delay:150ms] [animation-duration:500ms]">
          <Link
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-10 gap-2 pr-2.5 pl-4 text-sm"
            )}
            to="/login"
          >
            <FlaskIcon size={15} />
            Start optimizing
            {isClient ? (
              <span className="flex items-center gap-0.5">
                <Kbd className={CAP}>{isMac() ? "⌘" : "Ctrl"}</Kbd>
                <Kbd className={CAP}>↵</Kbd>
              </span>
            ) : null}
          </Link>
          <a
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "h-10 gap-2 px-4 text-sm"
            )}
            href={REPO_URL}
            rel="noreferrer"
            target="_blank"
          >
            <GithubIcon className="size-[15px]" />
            View source
          </a>
        </div>

        {/* A sentence rather than a table: the words name each group, so the
            marks carry no labels of their own and the line stays one line. */}
        <p className="fade-in-0 slide-in-from-bottom-2 mt-9 flex animate-in flex-wrap items-center gap-x-2.5 gap-y-3 fill-mode-both text-muted-foreground/80 text-sm leading-normal ease-out [animation-delay:225ms] [animation-duration:500ms]">
          Works with <MarkRow items={HARNESSES} /> across{" "}
          <MarkRow items={SANDBOXES} />
        </p>
      </section>
    </SiteLayout>
  );
}
