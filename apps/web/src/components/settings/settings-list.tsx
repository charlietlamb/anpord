import { Button } from "@anpord/ui/components/button";
import { EmptyState } from "@anpord/ui/components/empty-state";
import { type Icon, PlusIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { RowList } from "@/components/layout/row-list";

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
  readonly empty: string | null;
  readonly emptyTitle: string;
  readonly Icon: Icon;
  readonly onAdd: () => void;
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
      className="m-auto max-h-64 w-full max-w-md flex-none gap-3 py-10"
      description={empty}
      icon={<Icon />}
      title={emptyTitle}
    />
  );
}
