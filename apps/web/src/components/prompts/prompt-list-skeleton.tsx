import { SkeletonRows } from "@/components/layout/skeleton-rows";

/** Mirrors PromptRow: a face, a name, its handle, then version and time. */
const NAMES = ["w-32", "w-40", "w-28", "w-36", "w-24"];
const META = ["w-24", "w-8", "w-24"];

export function PromptListSkeleton() {
  return (
    <SkeletonRows leading="size-5 rounded-full" meta={META} widths={NAMES} />
  );
}
