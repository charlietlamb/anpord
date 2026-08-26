import { Button } from "@anpord/ui/components/button";
import { EmptyState } from "@anpord/ui/components/empty-state";
import type { Icon } from "@phosphor-icons/react";
import { PlusIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { RowList } from "@/components/layout/row-list";

/**
 * One kind of connection, with the reason it exists beside its name.
 *
 * Harnesses and sandboxes were one undifferentiated list under two quiet
 * labels, which hid the only thing a reader needs before adding anything: a
 * harness is required and a sandbox is not. Saying so under the heading costs
 * a line and answers the question the page was previously answering with a
 * disabled button on another screen.
 */
export function ConnectionSection({
  addLabel,
  children,
  emptyNote,
  Icon,
  note,
  onAdd,
  title,
}: {
  readonly addLabel: string;
  readonly children: ReactNode;
  /** Null once there is a row, since the rows then say what is here. */
  readonly emptyNote: string | null;
  readonly Icon: Icon;
  readonly note: string;
  readonly onAdd: () => void;
  readonly title: string;
}) {
  const add = (
    <Button onClick={onAdd} size="sm" variant="outline">
      <PlusIcon className="size-3.5" />
      {addLabel}
    </Button>
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-medium text-sm">{title}</h2>
          <p className="max-w-prose text-muted-foreground text-xs">{note}</p>
        </div>

        {/* Offered twice only while the section is empty, where the one in
            the middle of the panel is the obvious next thing to press. */}
        {emptyNote === null ? add : null}
      </div>

      {emptyNote === null ? (
        <RowList label={title}>{children}</RowList>
      ) : (
        <EmptyState
          action={add}
          className="gap-3 py-10"
          description={emptyNote}
          icon={<Icon />}
          title={`No ${title.toLowerCase()} connected`}
        />
      )}
    </section>
  );
}
