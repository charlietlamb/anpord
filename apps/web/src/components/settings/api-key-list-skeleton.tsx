import { SkeletonRows } from "@/components/layout/skeleton-rows";

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
