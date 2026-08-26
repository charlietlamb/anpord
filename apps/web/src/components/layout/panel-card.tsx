import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * A card a page is built around.
 *
 * The sign-in and check-your-email screens had each rebuilt this shell by hand
 * and drifted: one aligned its text left and the others did not, and both
 * re-wrote the heading style this file already owns.
 *
 * `mark` is for a screen a reader arrives at cold, where the product should
 * name itself beside the title. Everything inside the app already knows where
 * it is, so it renders nothing there.
 */
export function PanelCard({
  children,
  description,
  heading = "h2",
  mark,
  title,
}: {
  readonly children?: ReactNode;
  readonly description: ReactNode;
  readonly heading?: "h1" | "h2";
  readonly mark?: ReactNode;
  readonly title: string;
}) {
  const Heading = heading;

  return (
    <div className="panel-card-shadow w-full max-w-sm rounded-[3px] border border-border bg-card p-8 text-left">
      <div className={cn("flex items-center", mark === undefined || "gap-2")}>
        {mark}
        <Heading className="font-heading text-xl tracking-tight">
          {title}
        </Heading>
      </div>

      <p className="mt-2 text-muted-foreground text-sm">{description}</p>
      {children}
    </div>
  );
}
