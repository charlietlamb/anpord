import { Skeleton } from "@anpord/ui/components/skeleton";

/* Mirrors NavUser's trigger: the same h-12 button box, a size-7 avatar with
   the avatar's own rounding, and two lines of text rather than one slab, so
   the footer does not change shape when the user arrives. */
export function NavUserSkeleton() {
  return (
    <div className="flex h-12 w-full items-center gap-2 overflow-hidden rounded-[calc(var(--radius-sm)+2px)] p-2 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!">
      <Skeleton className="size-7 shrink-0 rounded-md" />

      <div className="grid flex-1 gap-1.5 group-data-[collapsible=icon]:hidden">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2.5 w-32" />
      </div>

      <Skeleton className="ml-1 size-4 shrink-0 rounded-sm group-data-[collapsible=icon]:hidden" />
    </div>
  );
}
