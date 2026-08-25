import { SkeletonRows } from "@/components/layout/skeleton-rows";

/** Mirrors ApiKeyRow: a name, the key's opening characters after it, then
 * when it was made. One meta column because the row sets one; a second held
 * 80px the row never fills. */
const NAMES = ["w-28", "w-20", "w-32"];
const META = ["w-20"];

export function ApiKeyListSkeleton() {
  return (
    <SkeletonRows
      leading={null}
      meta={META}
      trailing="ml-2 w-16"
      widths={NAMES}
    />
  );
}
