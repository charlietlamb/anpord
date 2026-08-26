import { WarningIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { integrationLabel } from "@/lib/evals/variant-presentation";

/* A list read as a sentence: "Codex and Daytona" rather than "Codex, Daytona".
   Two is the common case, and a comma between two names reads as a fragment. */
const listed = (names: readonly string[]) => {
  if (names.length <= 1) {
    return names[0] ?? "";
  }

  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
};

/**
 * Why the run button will not start anything.
 *
 * A run needs a credential for every harness it names -- sandboxes fall back
 * to Anpord's own account -- and the form picks one by default once it
 * exists, so this appears only when a harness has none at all. It names which
 * ones and links to where they are added, because "disabled" on its own is a
 * dead end for the reader who has just signed up and has nothing configured
 * yet.
 */
export function BlockedNote({
  failed,
  missing,
}: {
  readonly failed: boolean;
  readonly missing: readonly string[];
}) {
  if (failed) {
    return (
      <span className="text-muted-foreground text-xs">
        Connections could not be loaded, so a run cannot be started yet.
      </span>
    );
  }

  if (missing.length === 0) {
    return null;
  }

  return (
    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
      <WarningIcon
        aria-hidden="true"
        className="shrink-0 text-warning"
        size={13}
      />

      <span>
        Needs a credential for {listed(missing.map(integrationLabel))}.{" "}
        <Link
          className="text-foreground underline underline-offset-2 hover:no-underline"
          to="/settings/connections"
        >
          Add one
        </Link>
      </span>
    </span>
  );
}
