import { buttonVariants } from "@anpord/ui/lib/button-variants";
import type { HeaderPreset } from "@anpord/ui/lib/header-presets";
import { cn } from "@anpord/ui/lib/utils";
import { ArrowRightIcon, BookOpenIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { GithubIcon } from "@/components/icons/github-icon";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DOCS_URL, GITHUB_URL } from "@/lib/urls";

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

const VERCEL_SIGN_IN =
  "bg-transparent text-foreground shadow-[0_0_0_1px_rgb(0_0_0/0.12)] hover:bg-alpha-4 dark:bg-[#0a0a0a] dark:text-[#ededed] dark:shadow-[0_0_0_1px_#2e2e2e] dark:hover:bg-[#161616]";

export function HeaderActions({ preset }: { readonly preset: HeaderPreset }) {
  return (
    <>
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
          preset.signIn === "vercel" && VERCEL_SIGN_IN
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
    </>
  );
}
