import { Logo } from "@anpord/ui/components/logo";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";

export function Landing() {
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
                "btn-primary-glow h-10 px-8 text-sm"
              )}
              to="/login"
            >
              Get started
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
