import { Wordmark } from "@anpord/ui/components/wordmark";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import {
  CURRENT_HEADER,
  type HeaderPreset,
} from "@anpord/ui/lib/header-presets";
import { cn } from "@anpord/ui/lib/utils";
import { ArrowRightIcon, BookOpenIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { type MouseEvent, useEffect, useState } from "react";
import { GithubIcon } from "@/components/icons/github-icon";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DOCS_URL, GITHUB_URL } from "@/lib/urls";

const GROUP =
  "rounded-full border border-border bg-card/70 backdrop-blur-lg dark:bg-muted/70";

const CHIP =
  "hidden h-9 items-center gap-2 rounded-full bg-alpha-4 px-3.5 text-muted-foreground text-xs xl:flex";

function StatChips() {
  return (
    <>
      <span className={CHIP}>
        GitHub
        <span className="text-foreground tabular-nums">2,184</span>
      </span>
      <span className={CHIP}>
        npm
        <span className="text-foreground tabular-nums">18.2k</span>
      </span>
    </>
  );
}

function ShortcutChip() {
  return (
    <span className="hidden h-6 items-center rounded-md border border-alpha-8 px-1.5 text-[11px] text-muted-foreground tabular-nums sm:flex">
      ⌘K
    </span>
  );
}

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return scrolled;
}

function PresetHeader({ preset }: { readonly preset: HeaderPreset }) {
  const scrolled = useScrolled();
  const [glow, setGlow] = useState({ x: -200, y: 0 });
  const morphing = preset.chrome === "morph";

  const trackGlow = (event: MouseEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();

    setGlow({ x: event.clientX - box.left, y: event.clientY - box.top });
  };

  const segmented = preset.nav === "segmented";

  return (
    <div
      className={cn(
        "mx-auto transition-[max-width,top] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        preset.offset,
        morphing && !scrolled && "top-0 max-w-[1536px] px-10"
      )}
    >
      <header
        className={cn(
          "relative transition-[background-color,border-color,box-shadow,height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          preset.bar,
          morphing &&
            !scrolled &&
            "!bg-transparent !shadow-none border-transparent backdrop-blur-none"
        )}
      >
        {preset.chrome === "glow" && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-[inherit]"
            onMouseLeave={() => setGlow({ x: -200, y: 0 })}
            onMouseMove={trackGlow}
            style={{
              background: `radial-gradient(200px circle at ${glow.x}px ${glow.y}px, color-mix(in oklch, var(--foreground) 10%, transparent), transparent 70%)`,
            }}
          />
        )}

        <div
          className={cn(
            "relative flex items-center transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            preset.inner,
            morphing && !scrolled && "h-[72px]"
          )}
        >
          <div
            className={cn(
              "flex shrink-0 items-center",
              segmented && GROUP,
              segmented && "h-11 px-5"
            )}
          >
            <Link
              aria-label="Anpord home"
              className="text-foreground transition-opacity hover:opacity-70"
              to="/"
            >
              <Wordmark />
            </Link>
          </div>

          <div
            className={cn(
              "ml-auto flex items-center gap-2",
              segmented && cn(GROUP, "h-11 px-2 pl-3")
            )}
          >
            {preset.extra === "stars" && <StatChips />}
            {preset.extra === "shortcut" && <ShortcutChip />}
            <a
              aria-label="Anpord on GitHub"
              className={cn(
                buttonVariants({ size: "icon-sm", variant: "ghost" }),
                preset.link,
                "text-muted-foreground"
              )}
              href={GITHUB_URL}
              rel="noreferrer"
              target="_blank"
            >
              <GithubIcon />
            </a>
            <ThemeToggle />
            <span aria-hidden className="mx-1 h-5 w-px bg-alpha-8" />
            <a
              className={cn(
                buttonVariants({
                  size: "sm",
                  variant: preset.signIn === "outline" ? "outline" : "ghost",
                }),
                preset.link,
                "hidden sm:inline-flex",
                preset.signIn === undefined && "text-muted-foreground",
                preset.signIn === "vercel" &&
                  "bg-transparent text-foreground shadow-[0_0_0_1px_rgb(0_0_0/0.12)] hover:bg-alpha-4 dark:bg-[#0a0a0a] dark:text-[#ededed] dark:shadow-[0_0_0_1px_#2e2e2e] dark:hover:bg-[#161616]"
              )}
              href={DOCS_URL}
              rel="noreferrer"
              target="_blank"
            >
              <BookOpenIcon weight="fill" />
              Docs
            </a>
            <Link
              className={cn(
                buttonVariants({ size: "sm", variant: preset.cta }),
                preset.link
              )}
              to="/login"
            >
              Sign in
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}

export function SiteHeader({ preset }: { readonly preset?: HeaderPreset }) {
  return <PresetHeader preset={preset ?? CURRENT_HEADER} />;
}
