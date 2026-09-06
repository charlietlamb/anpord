import { SkeletonRows } from "@/components/layout/skeleton-rows";

const NAMES = ["w-32", "w-40", "w-28", "w-36", "w-24"];
const META = ["w-8", "w-24"];

export function PromptListSkeleton() {
  return (
    <SkeletonRows
      leading="size-5 rounded-full"
      meta={META}
      trailing="ml-2.5 w-20"
      widths={NAMES}
    />
  );
}
