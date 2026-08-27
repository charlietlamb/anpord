import { UsersThreeIcon } from "@phosphor-icons/react";
import { integrationLabel } from "@/lib/evals/variant-presentation";

/* "Ada and Grace" rather than "Ada, Grace": two is the common case, and a
   comma between two names reads as a fragment. Beyond three the tail is
   counted, because the point is that somebody has it, not who all of them
   are. */
const NAMED = 2;

const listed = (owners: readonly string[]) => {
  if (owners.length <= NAMED) {
    return owners.join(" and ");
  }

  const rest = owners.length - NAMED;

  return `${owners.slice(0, NAMED).join(", ")} and ${rest} other${rest === 1 ? "" : "s"}`;
};

/**
 * That a teammate already has this integration, where the reader does not.
 *
 * A personal connection is invisible to the rest of the organization, which
 * is right for the credential and wrong for the fact: someone landing on an
 * empty Codex section had no way to know their team was already set up, and
 * would go and buy a second subscription. Names only, never the secret.
 */
export function ConnectedElsewhere({
  integrationId,
  owners,
}: {
  readonly integrationId: string;
  readonly owners: readonly string[];
}) {
  if (owners.length === 0) {
    return null;
  }

  return (
    <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
      <UsersThreeIcon aria-hidden="true" className="size-3.5 shrink-0" />
      <span>
        {listed(owners)} {owners.length === 1 ? "has" : "have"}{" "}
        {integrationLabel(integrationId)} connected. Ask them to share it with
        the organization, or add your own.
      </span>
    </p>
  );
}
