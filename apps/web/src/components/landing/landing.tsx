import { Logo } from "@anpord/ui/components/logo";
import { Kbd } from "@anpord/ui/components/ui/kbd";
import { isMac, useShortcut } from "@anpord/ui/hooks/use-shortcut";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { PencilLineIcon } from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useIsClient } from "@/lib/use-is-client";

/** currentColor is the fill here, so the caps need their own contrast. */
const CAP = "border-white/20 bg-white/16 text-white/80";

export function Landing() {
  const navigate = useNavigate();
  /** The caps promise a shortcut, so it has to actually work. */
  useShortcut("enter", {
    meta: true,
    onTrigger: () => navigate({ to: "/login" }),
  });
  /** navigator is server-undefined, so the glyph resolves after mount. */
  const isClient = useIsClient();

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-6">
        <header className="flex items-center gap-2 py-8">
          <Logo className="size-[26px]" />
          <span className="font-heading font-medium text-xl tracking-[-0.03em]">
            Anpord
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center pb-24">
          <h1 className="fade-in-0 slide-in-from-bottom-2 animate-in text-balance fill-mode-both font-heading text-5xl tracking-tight ease-out [animation-duration:500ms] sm:text-6xl">
            Customer configuration for AI products.
          </h1>
          <p className="fade-in-0 slide-in-from-bottom-2 mt-5 max-w-lg animate-in text-balance fill-mode-both text-muted-foreground ease-out [animation-delay:75ms] [animation-duration:500ms] sm:text-lg">
            Define, ship, and version the settings your customers control —
            without redeploying.
          </p>
          <div className="fade-in-0 slide-in-from-bottom-2 mt-8 animate-in fill-mode-both ease-out [animation-delay:150ms] [animation-duration:500ms]">
            <Link
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-10 gap-2 pr-2.5 pl-4 text-sm"
              )}
              to="/login"
            >
              <PencilLineIcon size={15} />
              Start Prompting
              {isClient ? (
                <span className="flex items-center gap-0.5">
                  <Kbd className={CAP}>{isMac() ? "⌘" : "Ctrl"}</Kbd>
                  <Kbd className={CAP}>↵</Kbd>
                </span>
              ) : null}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
