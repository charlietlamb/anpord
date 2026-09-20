import { cn } from "@anpord/ui/lib/utils";

export function PendingDot({ className }: { readonly className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative flex size-1.5 shrink-0", className)}
    >
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
      <span className="relative inline-flex size-1.5 rounded-full bg-current" />
    </span>
  );
}
