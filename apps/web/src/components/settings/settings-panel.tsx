import { Button } from "@anpord/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface SettingsPanelProps {
  readonly actions?: ReactNode;
  readonly add?: { readonly label: string; readonly onAdd: () => void };
  readonly children: ReactNode;
  readonly description?: string;
  /* Hidden while empty: the empty state already offers the same action. */
  readonly empty?: boolean;
  readonly title: string;
}

export function SettingsPanel({
  add,
  actions,
  children,
  description,
  empty = false,
  title,
}: SettingsPanelProps) {
  const addButton =
    add === undefined || empty ? null : (
      <Button onClick={add.onAdd} size="sm">
        <PlusIcon className="size-3.5" />
        {add.label}
      </Button>
    );

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-heading text-base tracking-tight">{title}</h1>
          {description ? (
            <p className="max-w-prose text-muted-foreground text-xs">
              {description}
            </p>
          ) : null}
        </div>

        {actions || addButton ? (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {actions}
            {addButton}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}
