import { cn } from "@anpord/ui/lib/utils";
import type { Icon } from "@phosphor-icons/react";

interface PageHeadingProps {
  readonly className?: string;
  readonly icon: Icon;
  readonly title: string;
}

/**
 * What page this is, at the top left of its bar.
 *
 * The breadcrumb above names it too, but it is chrome the eye skips past on
 * the way in. Said once more where the content starts, the page has a corner
 * to begin at rather than a control floating at the far end of an empty rule.
 */
export function PageHeading({
  className,
  icon: Icon,
  title,
}: PageHeadingProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-2 font-semibold text-muted-foreground text-sm",
        className
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground/70" weight="fill" />
      {title}
    </span>
  );
}
