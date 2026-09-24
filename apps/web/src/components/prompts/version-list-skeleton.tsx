import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";
import { RowList } from "@/components/layout/row-list";

const MESSAGES = ["w-28", "w-20", "w-24"];

export function VersionListSkeleton() {
  return (
    <RowList>
      {MESSAGES.map((width) => (
        <div className="flex h-10 items-center gap-2.5 px-2" key={width}>
          <Skeleton className="size-1.5 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-5 shrink-0" />
          <Skeleton className={cn("h-3", width)} />
          <Skeleton className="ml-auto h-3 w-10" />
        </div>
      ))}
    </RowList>
  );
}
