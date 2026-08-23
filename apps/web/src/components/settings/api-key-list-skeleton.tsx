import { SkeletonRows } from "@/components/layout/skeleton-rows";

/** Mirrors ApiKeyRow: a name, a prefix, a created time. */
const NAMES = ["w-28", "w-20", "w-32"];
const META = ["w-16", "w-20"];

export function ApiKeyListSkeleton() {
  return <SkeletonRows leading={null} meta={META} widths={NAMES} />;
}
