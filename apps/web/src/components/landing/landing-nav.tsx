import { DOCS_ORIGIN } from "@anpord/schema/public/origins";
import { Wordmark } from "@anpord/ui/components/wordmark";
import { Link } from "@tanstack/react-router";
import { GITHUB_URL } from "@/lib/urls";

const QUIET =
  "hidden text-[14px] text-muted-foreground transition-colors duration-150 hover:text-foreground sm:inline";

export function LandingNav() {
  return (
    <header className="absolute inset-x-0 top-0 flex h-16 items-center justify-between px-6 lg:px-[72px]">
      <Link
        aria-label="Anpord home"
        className="text-foreground transition-opacity duration-150 hover:opacity-70"
        to="/"
      >
        <Wordmark />
      </Link>
      <nav className="flex items-center gap-5">
        <a
          className={QUIET}
          href={DOCS_ORIGIN}
          rel="noreferrer"
          target="_blank"
        >
          Docs
        </a>
        <a className={QUIET} href={GITHUB_URL} rel="noreferrer" target="_blank">
          GitHub
        </a>
        <Link
          className="text-[14px] text-foreground transition-opacity duration-150 hover:opacity-70"
          to="/login"
        >
          Sign in
        </Link>
        <Link
          className="flex h-[30px] items-center rounded-[4px] bg-foreground px-3 font-[450] text-[14px] text-background transition-opacity duration-150 hover:opacity-85"
          to="/login"
        >
          Start
        </Link>
      </nav>
    </header>
  );
}
