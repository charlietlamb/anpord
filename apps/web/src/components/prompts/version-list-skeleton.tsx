import { SkeletonRows } from "@/components/layout/skeleton-rows";

/** Mirrors VersionRow: one line, number then message then time. */
const MESSAGES = ["w-28", "w-20", "w-24"];
const META = ["w-10"];

export function VersionListSkeleton() {
  return (
    <SkeletonRows
      leading="size-1.5 rounded-full"
      meta={META}
      widths={MESSAGES}
    />
  );
}
