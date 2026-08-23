import { SkeletonRows } from "@/components/layout/skeleton-rows";

/** Mirrors EvalRow: a status mark, the name, its variants, then the numbers. */
const NAMES = ["w-36", "w-28", "w-40", "w-32", "w-24"];
const META = ["w-14", "w-10", "w-14", "w-8", "w-14"];

export function EvalListSkeleton() {
  return <SkeletonRows meta={META} widths={NAMES} />;
}
