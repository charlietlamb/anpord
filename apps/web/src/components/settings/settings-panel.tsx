import type { ReactNode } from "react";

interface SettingsPanelProps {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
}

export function SettingsPanel({
  actions,
  title,
  description,
  children,
}: SettingsPanelProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl tracking-tight">{title}</h1>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
