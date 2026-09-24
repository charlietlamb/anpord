import { Button } from "@anpord/ui/components/button";
import { ActionTooltip } from "@anpord/ui/components/ui/action-tooltip";
import { DataTableRow } from "@anpord/ui/components/ui/data-table";
import { TrashIcon } from "@phosphor-icons/react";
import { useRelativeTime } from "@/lib/use-relative-time";

interface ApiKeyRowProps {
  readonly createdAt: Date | string;
  readonly name: string;
  readonly onRevoke: () => void;
  readonly start: string | null;
}

export function ApiKeyRow({
  createdAt,
  name,
  onRevoke,
  start,
}: ApiKeyRowProps) {
  const created = useRelativeTime(new Date(createdAt));

  return (
    <DataTableRow>
      <span className="truncate text-foreground">{name}</span>
      <span className="truncate font-mono text-muted-foreground text-xs">
        {start ? `${start}…` : "—"}
      </span>
      <span className="text-muted-foreground tabular-nums">{created}</span>
      <ActionTooltip label={`Revoke ${name}`}>
        <Button
          aria-label={`Revoke ${name}`}
          className="hover:text-destructive"
          onClick={onRevoke}
          size="icon-xs"
          variant="bare"
        >
          <TrashIcon />
        </Button>
      </ActionTooltip>
    </DataTableRow>
  );
}
