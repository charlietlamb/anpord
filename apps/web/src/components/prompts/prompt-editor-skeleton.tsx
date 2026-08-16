import { Skeleton } from "@anpord/ui/components/skeleton";

export function PromptEditorSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-border border-b px-6 py-4 xl:px-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="ml-auto h-[1.875rem] w-32" />
      </header>

      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8 xl:px-8">
        <Skeleton className="min-h-[24rem] w-full rounded-[18px]" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
