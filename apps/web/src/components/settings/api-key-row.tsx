import { Button } from "@anpord/ui/components/button";
import { ActionTooltip } from "@anpord/ui/components/ui/action-tooltip";
import { TrashIcon } from "@phosphor-icons/react";
import { ListRow } from "@/components/layout/list-row";
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
            className="size-5 shrink-0 rounded opacity-0 hover:text-destructive focus-visible:opacity-100 group-hover/row:opacity-100"
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
      <span className="text-foreground">{name}</span>
      <span className="ml-2 font-mono text-xs opacity-60">
        {start ? `${start}…` : "—"}
      </span>
    </ListRow>
  );
}
