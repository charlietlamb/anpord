import { cn } from "@anpord/ui/lib/utils";

const SIZES = {
  page: "font-heading text-xl tracking-tight",
  section: "font-medium text-sm",
} as const;

export function PageHeading({
  className,
  size = "page",
  title,
}: {
  readonly className?: string;
  readonly size?: keyof typeof SIZES;
  readonly title: string;
}) {
  return (
    <span
      className={cn("shrink-0 truncate text-foreground", SIZES[size], className)}
    >
      {title}
    </span>
  );
}
