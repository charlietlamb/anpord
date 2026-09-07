import { Button } from "@anpord/ui/components/button";
import { Logo } from "@anpord/ui/components/logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@anpord/ui/components/ui/dialog";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { ArrowDownIcon, ArrowLeftIcon, StarIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  LATEST_LOGOS,
  LOGOS,
  LogoMark,
  logoDownload,
} from "@/components/dev/logo-marks";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const FILTERS = [
  "Latest",
  "All",
  "Organic",
  "Motion",
  "Structure",
  "Circular",
  "Openwork",
  "Experimental",
  "Anvil",
  "Shortlist",
] as const;

export function LogosPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [inverse, setInverse] = useState(false);
  const [wordmark, setWordmark] = useState(false);
  const visible = LOGOS.filter((logo) => {
    if (filter === "Anvil") {
      return logo.family === "Anvil" || logo.name === "Anvil";
    }
    if (filter === "Latest") {
      return LATEST_LOGOS.some((latest) => latest.name === logo.name);
    }
    if (filter === "Shortlist") {
      return favorites.includes(logo.name);
    }
    return filter === "All" || logo.family === filter;
  });

  function toggleFavorite(name: string) {
    setFavorites((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-5 pb-16 sm:px-10">
        <header className="flex h-24 items-center justify-between border-border border-b">
          <Link
            className="flex items-center gap-1 font-heading font-medium text-xl tracking-tight"
            to="/home"
          >
            <Logo />
            Anpord
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em] sm:block">
              Identity studies / 001
            </span>
            <ThemeToggle />
          </div>
        </header>

        <section className="grid gap-6 py-12 sm:py-16 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-4 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
              {LOGOS.length} marks. Six parts. One identity.
            </p>
            <h1 className="font-heading text-4xl tracking-[-0.04em] sm:text-6xl">
              A little order.
              <br />A lot of possibility.
            </h1>
            <p className="mt-5 max-w-lg text-muted-foreground text-sm leading-relaxed">
              Six parts, rotated into a whole. A study in rhythm, precision, and
              the many ways Anpord could take shape.
            </p>
          </div>
          <p className="max-w-52 text-muted-foreground text-xs leading-relaxed">
            Click a mark to look closer.
            <br />
            Star your favorites to compare them.
          </p>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-border border-y py-4">
          <fieldset aria-label="Logo families" className="flex flex-wrap gap-1">
            {FILTERS.map((item) => (
              <Button
                aria-pressed={filter === item}
                key={item}
                onClick={() => setFilter(item)}
                size="sm"
                variant={filter === item ? "secondary" : "ghost"}
              >
                {item}
                {item === "Shortlist" ? ` (${favorites.length})` : ""}
              </Button>
            ))}
          </fieldset>
          <div className="flex gap-1">
            <Button
              aria-pressed={wordmark}
              onClick={() => setWordmark(!wordmark)}
              size="sm"
              variant={wordmark ? "secondary" : "ghost"}
            >
              Wordmark
            </Button>
            <Button
              aria-pressed={inverse}
              onClick={() => setInverse(!inverse)}
              size="sm"
              variant={inverse ? "secondary" : "ghost"}
            >
              Invert
            </Button>
          </div>
        </div>

        <div
          aria-live="polite"
          className="flex justify-between py-5 font-mono text-[10px] text-muted-foreground uppercase tracking-wider"
        >
          <span>
            {filter === "All" ? "The collection" : filter} /{" "}
            {String(visible.length).padStart(2, "0")}
          </span>
          <span>Six-part studies · SVG</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((logo) => {
            const number = String(LOGOS.indexOf(logo) + 1).padStart(2, "0");
            const favorite = favorites.includes(logo.name);
            return (
              <article
                className="overflow-hidden rounded-xl border border-border"
                key={logo.name}
              >
                <Dialog>
                  <DialogTrigger
                    aria-label={`Preview ${number} ${logo.name}`}
                    className={cn(
                      "group flex aspect-square w-full cursor-pointer items-center justify-center gap-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                      inverse
                        ? "bg-[#191919] text-[#fafafa] hover:bg-[#232323]"
                        : "bg-[#f5f5f3] text-[#191919] hover:bg-[#eeeeeb]"
                    )}
                  >
                    <LogoMark
                      className={cn(
                        "shrink-0 transition-transform duration-300 motion-safe:group-hover:scale-105",
                        wordmark ? "size-12" : "size-28"
                      )}
                      logo={logo}
                    />
                    {wordmark && (
                      <span className="font-heading font-medium text-3xl tracking-[-0.04em]">
                        Anpord
                      </span>
                    )}
                  </DialogTrigger>
                  <DialogContent className="max-h-[90svh] overflow-y-auto p-6 sm:max-w-2xl">
                    <DialogTitle className="font-heading text-xl">
                      {number} / {logo.name}
                    </DialogTitle>
                    <DialogDescription>
                      {logo.family} ·{" "}
                      {"angles" in logo
                        ? "Six shapes, with offset spacing."
                        : "Six shapes, repeated every 60°."}
                    </DialogDescription>
                    <div className="grid grid-cols-2 overflow-hidden rounded-lg">
                      {[false, true].map((dark) => (
                        <div
                          className={cn(
                            "flex aspect-square items-center justify-center",
                            dark
                              ? "bg-[#191919] text-[#fafafa]"
                              : "bg-[#f5f5f3] text-[#191919]"
                          )}
                          key={String(dark)}
                        >
                          <LogoMark className="w-3/5" logo={logo} />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-6 border-border border-b py-6">
                      <div className="flex items-center gap-3">
                        <LogoMark className="size-12" logo={logo} />
                        <span className="font-heading font-medium text-3xl tracking-[-0.04em]">
                          Anpord
                        </span>
                      </div>
                      <div className="flex items-end gap-5">
                        {[16, 24, 32].map((size) => (
                          <div
                            className="flex flex-col items-center gap-2"
                            key={size}
                          >
                            <LogoMark height={size} logo={logo} width={size} />
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {size}px
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <Button
                        aria-pressed={favorite}
                        onClick={() => toggleFavorite(logo.name)}
                        variant="outline"
                      >
                        <StarIcon weight={favorite ? "fill" : "regular"} />
                        {favorite ? "Shortlisted" : "Add to shortlist"}
                      </Button>
                      <a
                        className={buttonVariants({ variant: "default" })}
                        download={`anpord-${number}-${logo.name.toLowerCase()}.svg`}
                        href={logoDownload(logo)}
                      >
                        <ArrowDownIcon />
                        Download SVG
                      </a>
                    </div>
                  </DialogContent>
                </Dialog>
                <div className="flex items-center gap-3 border-border border-t px-4 py-3">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {number}
                  </span>
                  <div className="flex-1">
                    <h2 className="font-medium text-sm">{logo.name}</h2>
                    <p className="text-[11px] text-muted-foreground">
                      {logo.family}
                    </p>
                  </div>
                  <Button
                    aria-label={`${favorite ? "Remove" : "Shortlist"} ${logo.name}${favorite ? " from shortlist" : ""}`}
                    aria-pressed={favorite}
                    onClick={() => toggleFavorite(logo.name)}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <StarIcon
                      className={
                        favorite ? "text-foreground" : "text-muted-foreground"
                      }
                      weight={favorite ? "fill" : "regular"}
                    />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
        {visible.length === 0 && (
          <div className="py-24 text-center">
            <StarIcon className="mx-auto mb-4 size-7 text-muted-foreground" />
            <h2 className="font-heading text-xl">Make a little shortlist.</h2>
            <p className="mt-2 text-muted-foreground text-sm">
              Star a few marks, then compare your favorites here.
            </p>
            <Button
              className="mt-5"
              onClick={() => setFilter("All")}
              variant="outline"
            >
              Explore all {LOGOS.length}
            </Button>
          </div>
        )}

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-border border-t pt-6 text-muted-foreground text-xs">
          <Link
            className="flex items-center gap-2 hover:text-foreground"
            to="/home"
          >
            <ArrowLeftIcon className="size-3.5 shrink-0" />
            Back to Anpord
          </Link>
          <span>
            Explorations, not the final word. Shortlist kept for this visit.
          </span>
        </footer>
      </div>
    </main>
  );
}
