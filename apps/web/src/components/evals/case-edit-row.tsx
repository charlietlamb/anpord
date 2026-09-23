import type { EvalCaseVersion } from "@anpord/schema/domain/evals";
import { DataTableRow } from "@anpord/ui/components/ui/data-table";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import {
  PencilSimpleIcon,
  SparkleIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { AgeCell } from "@/components/evals/age-cell";

const listed = (parts: readonly string[]) =>
  parts.length < 2
    ? parts.join("")
    : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;

export function CaseEditRow({
  created,
  version,
}: {
  readonly created: boolean;
  readonly version: EvalCaseVersion;
}) {
  const change = created
    ? "Created this case"
    : `Changed the ${listed(version.changes) || "definition"}`;

  return (
    <DataTableRow>
      <span className="flex min-w-0 items-center gap-2.5 text-foreground">
        <UserCircleIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
          weight="fill"
        />
        <span className="truncate">{version.author ?? "Unknown author"}</span>
      </span>

      <span className="truncate text-muted-foreground">{change}</span>

      <span />

      <span>
        <StatusBadge icon={created ? SparkleIcon : PencilSimpleIcon}>
          {created ? "Created" : "Edited"}
        </StatusBadge>
      </span>

      <AgeCell at={version.createdAt.epochMillis} />

      <span />
    </DataTableRow>
  );
}
