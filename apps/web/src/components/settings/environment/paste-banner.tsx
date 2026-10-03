import { InfoIcon } from "@phosphor-icons/react";
import { Button } from "@sphynx/ui/components/button";

export function PasteBanner({
  count,
  onUndo,
}: {
  readonly count: number;
  readonly onUndo: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-blue-500/25 bg-blue-500/10 py-1.5 pr-1.5 pl-2.5 text-blue-700 text-xs dark:text-blue-300"
      role="status"
    >
      <InfoIcon
        aria-hidden="true"
        className="size-3.5 shrink-0"
        weight="fill"
      />
      <p className="min-w-0 flex-1">
        Pasted {count} {count === 1 ? "variable" : "variables"} from your .env.
        Comments and blank lines were skipped.
      </p>
      <Button
        className="text-current hover:text-current"
        onClick={onUndo}
        size="sm"
        type="button"
        variant="ghost"
      >
        Undo
      </Button>
    </div>
  );
}
