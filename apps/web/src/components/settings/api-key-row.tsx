import { Button } from "@anpord/ui/components/button";
import { ActionTooltip } from "@anpord/ui/components/ui/action-tooltip";
import { cn } from "@anpord/ui/lib/utils";
import { TrashIcon } from "@phosphor-icons/react";
import { ListRow, RowTitle } from "@/components/layout/list-row";
import { ROW_ACTION } from "@/components/layout/row-action";
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
    <ListRow
      /* Revoking is destructive and the control carries no label of its own,
         so it says what it does on approach rather than only to a reader
         using assistive technology. */
      actions={
        <ActionTooltip label={`Revoke ${name}`}>
          <Button
            aria-label={`Revoke ${name}`}
            className={cn(ROW_ACTION, "hover:text-destructive")}
            onClick={onRevoke}
            size="icon-sm"
            variant="bare"
          >
            <TrashIcon />
          </Button>
        </ActionTooltip>
      }
      meta={created}
    >
      <RowTitle>{name}</RowTitle>
      <span className="ml-2 font-mono text-xs opacity-60">
        {start ? `${start}…` : "—"}
      </span>
    </ListRow>
  );
}
