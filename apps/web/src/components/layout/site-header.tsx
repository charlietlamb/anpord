import { Logo } from "@anpord/ui/components/logo";
import { Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/layout/site-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between py-8">
      <Link
        aria-label="Anpord home"
        className="flex items-center gap-2 font-heading font-medium text-foreground text-lg tracking-tight transition-opacity hover:opacity-70"
        to="/"
      >
        <Logo className="size-5" />
        Anpord
      </Link>
      <nav className="flex items-center gap-1">
        <SiteNav />
        <ThemeToggle />
      </nav>
    </header>
  );
}
