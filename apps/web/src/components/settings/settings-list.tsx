import { Button } from "@anpord/ui/components/button";
import { EmptyState } from "@anpord/ui/components/empty-state";
import { type Icon, PlusIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { RowList } from "@/components/layout/row-list";

/**
 * The rows of one settings list, or the reason there are none.
 *
 * The heading and its action belong to the panel around this, where every
 * settings screen puts them, so a reader moving between Harnesses and API
 * keys finds the same control in the same corner. What is left is the list
 * and the state it is in when empty -- which is offered here rather than
 * written out again per page, because three of them had each decided
 * separately whether an empty list gets a mark, an action, or neither.
 */
export function SettingsList({
  addLabel,
  children,
  empty,
  emptyTitle,
  Icon,
  onAdd,
  title,
}: {
  readonly addLabel: string;
  readonly children: ReactNode;
  /** The empty state's own line, or null once there is a row to show. */
  readonly empty: string | null;
  /** What the empty state is titled, which is a statement rather than the
   * list's name said twice. */
  readonly emptyTitle: string;
  readonly Icon: Icon;
  readonly onAdd: () => void;
  /** Names the list for a screen reader, and the empty state after it. */
  readonly title: string;
}) {
  if (empty === null) {
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
      description={empty}
      icon={<Icon />}
      title={emptyTitle}
    />
  );
}
