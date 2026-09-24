import { Wordmark } from "@anpord/ui/components/wordmark";
import { Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/layout/site-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function SiteHeader() {
  return (
    <header className="flex h-16 items-center justify-between">
      <Link
        aria-label="Anpord home"
        className="text-foreground transition-opacity hover:opacity-70"
        to="/"
      >
        <Wordmark />
      </Link>
      <nav className="flex items-center gap-1">
        <SiteNav />
        <ThemeToggle />
      </nav>
    </header>
  );
}
