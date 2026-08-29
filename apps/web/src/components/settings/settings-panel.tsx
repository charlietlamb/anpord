import { Button } from "@anpord/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface SettingsPanelProps {
  readonly actions?: ReactNode;
  /** The one thing this page adds. Written here rather than per page so the
   * label, the mark and the size cannot drift, and so it can be withheld
   * while the list is empty -- the empty state offers the same action in the
   * middle of the panel, and two identical buttons on one screen read as a
   * mistake. */
  readonly add?: { readonly label: string; readonly onAdd: () => void };
  readonly children: ReactNode;
  /** What the setting does, where that is not obvious from its controls. */
  readonly description?: string;
  /** Hides `add`, since the empty state is already offering it. */
  readonly empty?: boolean;
  readonly title: string;
}

/**
 * One settings section.
 *
 * The title is stated here rather than left to the rail. The rail says which
 * page is selected, but it is a column of eight items read at a glance, and
 * the panel beside it opened with a sentence of body text where every other
 * screen opens with a heading -- so the page looked like it had lost its top.
 */
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
