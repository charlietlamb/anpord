import { PageTabs } from "@anpord/ui/components/ui/page-tabs";
import type { Icon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";

export interface TrialSection {
  readonly content: ReactNode;
  readonly Icon: Icon;
  readonly label: string;
  readonly value: string;
}

/* A section with nothing in it renders nothing, so its tab would open on an
   empty panel. */
export function TrialSections({
  sections,
}: {
  readonly sections: readonly TrialSection[];
}) {
  const [active, setActive] = useState<string | null>(null);

  if (sections.length === 0) {
    return null;
  }

  const open =
    sections.find((section) => section.value === active) ?? sections[0];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <PageTabs
        onChange={setActive}
        options={sections.map(({ Icon, label, value }) => ({
          Icon,
          label,
          value,
        }))}
        value={open.value}
      />

      <div className="min-w-0">{open.content}</div>
    </div>
  );
}
