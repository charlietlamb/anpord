import type { ReactNode } from "react";

interface SettingsPanelProps {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  /** What the setting does, where that is not obvious from its controls. */
  readonly description?: string;
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
  actions,
  children,
  description,
  title,
}: SettingsPanelProps) {
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

        {actions ? (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}
