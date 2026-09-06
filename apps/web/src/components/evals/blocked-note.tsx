import { WarningIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { integrationLabel } from "@/lib/evals/variant-presentation";

const listed = (names: readonly string[]) => {
  if (names.length <= 1) {
    return names[0] ?? "";
  }

  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
};

/* Only harnesses can be missing a credential; sandboxes fall back to Anpord's own account. */
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
          to="/settings/harnesses"
        >
          Add one
        </Link>
      </span>
    </span>
  );
}
