import { Button } from "@anpord/ui/components/button";
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
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium text-sm">{name}</span>
        <span className="font-mono text-muted-foreground text-xs">
          {start ? `${start}…` : "—"}
        </span>
      </div>

      {created ? (
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
          created {created}
        </span>
      ) : null}

      <Button
        aria-label={`Revoke ${name}`}
        className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRevoke}
        size="icon"
        variant="ghost"
      >
        <TrashIcon size={15} />
      </Button>
    </div>
  );
}
