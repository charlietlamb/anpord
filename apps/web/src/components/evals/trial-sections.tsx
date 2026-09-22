import { PageTabs } from "@anpord/ui/components/ui/page-tabs";
import type { Icon } from "@phosphor-icons/react";
import { parseAsString, useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { Swap } from "@/components/layout/swap";

export interface TrialSection {
  readonly content: ReactNode;
  readonly Icon: Icon;
  readonly label: string;
  readonly value: string;
}

export function TrialSections({
  sections,
}: {
  readonly sections: readonly TrialSection[];
}) {
  const [tab, setTab] = useQueryState("tab", parseAsString);
  const open = sections.find((section) => section.value === tab) ?? sections[0];

  if (open === undefined) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <PageTabs
        onChange={setTab}
        options={sections.map(({ Icon, label, value }) => ({
          Icon,
          label,
          value,
        }))}
        value={open.value}
      />

      <div className="relative min-w-0">
        <Swap className="min-w-0" swapKey={open.value}>
          {open.content}
        </Swap>
      </div>
    </div>
  );
}
