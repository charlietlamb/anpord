import { UsersThreeIcon } from "@phosphor-icons/react";
import { integrationLabel } from "@/lib/evals/variant-presentation";

/* Two names join with "and"; a comma between just two reads as a fragment. */
const NAMED = 2;

const listed = (owners: readonly string[]) => {
  if (owners.length <= NAMED) {
    return owners.join(" and ");
  }

  const rest = owners.length - NAMED;

  return `${owners.slice(0, NAMED).join(", ")} and ${rest} other${rest === 1 ? "" : "s"}`;
};

/* Names only, never the secret: a personal connection stays private. */
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
