import { useState } from "react";
import {
  findLastWorkingSection,
  findSectionIndex,
  type TimelineSection,
} from "@/lib/evals/timeline-sections";

export const useOpenSections = (
  sections: readonly TimelineSection[],
  step: number | null
) => {
  const [open, setOpen] = useState<ReadonlySet<number>>(() => {
    const selected = findSectionIndex(sections, step);
    const working = findLastWorkingSection(sections);
    const fallback = working === -1 ? sections.length - 1 : working;
    return new Set([selected === -1 ? fallback : selected]);
  });

  const setSection = (section: number, next: boolean) =>
    setOpen((current) => {
      const updated = new Set(current);
      if (next) {
        updated.add(section);
      } else {
        updated.delete(section);
      }
      return updated;
    });

  return {
    open,
    setSection,
    toggleSection: (section: number) => setSection(section, !open.has(section)),
  };
};
