import { Button } from "@anpord/ui/components/button";
import { EmptyState } from "@anpord/ui/components/empty-state";
import type { Icon } from "@phosphor-icons/react";
import { PlusIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { RowList } from "@/components/layout/row-list";

/**
 * The rows of one credential category, or the reason there are none.
 *
 * The heading and the add button belong to the page around this, where every
 * other settings screen puts them, so a reader moving between Harnesses and
 * API keys finds the same control in the same corner. What is left is the
 * list and its empty state.
 */
export function ConnectionSection({
  addLabel,
  children,
  emptyNote,
  Icon,
  onAdd,
  title,
}: {
  readonly addLabel: string;
  readonly children: ReactNode;
  /** Null once there is a row, since the rows then say what is here. */
  readonly emptyNote: string | null;
  readonly Icon: Icon;
  readonly onAdd: () => void;
  readonly title: string;
}) {
  if (emptyNote === null) {
    return <RowList label={title}>{children}</RowList>;
  }

  return (
    <EmptyState
      action={
        <Button onClick={onAdd} size="sm" variant="outline">
          <PlusIcon className="size-3.5" />
          {addLabel}
        </Button>
      }
      className="gap-3 py-10"
      description={emptyNote}
      icon={<Icon />}
      title={`No ${title.toLowerCase()} connected`}
    />
  );
}
