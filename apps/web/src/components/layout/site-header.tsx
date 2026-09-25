import { Wordmark } from "@anpord/ui/components/wordmark";
import {
  CURRENT_HEADER,
  type HeaderPreset,
} from "@anpord/ui/lib/header-presets";
import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HeaderActions } from "@/components/layout/header-actions";
import { HeaderGlow } from "@/components/layout/header-glow";

const GROUP =
  "rounded-full border border-border bg-card/70 backdrop-blur-lg dark:bg-muted/70";

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
  const morphing = preset.chrome === "morph";

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
        {preset.chrome === "glow" && <HeaderGlow />}

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
            <HeaderActions preset={preset} />
          </div>
        </div>
      </header>
    </div>
  );
}

export function SiteHeader({ preset }: { readonly preset?: HeaderPreset }) {
  return <PresetHeader preset={preset ?? CURRENT_HEADER} />;
}
