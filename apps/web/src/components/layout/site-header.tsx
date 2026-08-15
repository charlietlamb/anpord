import { Logo } from "@anpord/ui/components/logo";
import { Link } from "@tanstack/react-router";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between py-8">
      <Link
        aria-label="Anpord home"
        className="flex items-center gap-2 font-heading font-medium text-xl tracking-[-0.03em] transition-opacity hover:opacity-70"
        to="/"
      >
        <Logo className="size-[26px]" />
        Anpord
      </Link>
      <nav className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu />
      </nav>
    </header>
  );
}
