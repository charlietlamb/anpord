import { SkeletonRows } from "@/components/layout/skeleton-rows";

/** Mirrors ChannelListRow: a dot, a name, a count. */
const NAMES = ["w-24", "w-20", "w-28"];
const META = ["w-16"];

export function ChannelListSkeleton() {
  return (
    <SkeletonRows leading="size-1.5 rounded-full" meta={META} widths={NAMES} />
  );
}
