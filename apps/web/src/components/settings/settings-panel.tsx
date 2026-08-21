import type { ReactNode } from "react";

interface SettingsPanelProps {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  /** What the setting does, where that is not obvious from its controls. The
   * page is named by the breadcrumb and the rail beside it, so there is no
   * title here to repeat them. */
  readonly description?: string;
}

/**
 * One settings section. It carries no heading: settings already names itself
 * three times over — in the breadcrumb, in the rail, and in the nav item that
 * is highlighted — and a fourth would only push the controls down the page.
 */
export function SettingsPanel({
  actions,
  children,
  description,
}: SettingsPanelProps) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {description || actions ? (
        <div className="flex items-start justify-between gap-4">
          {description ? (
            <p className="max-w-prose text-muted-foreground text-sm">
              {description}
            </p>
          ) : null}
          {actions ? (
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}

      {children}
    </div>
  );
}
