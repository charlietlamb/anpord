import { cn } from "@anpord/ui/lib/utils";
import { CheckCircleIcon, CircleDashedIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useSetupProgress } from "@/lib/settings/use-setup-progress";

/**
 * What is left before the first eval can run.
 *
 * It removes itself rather than being dismissed: the one required step is a
 * harness, and once that exists the card has nothing left to say. GitHub is
 * listed because a repository list is better than a URL box, but it never
 * holds the card open -- an organization typing its URLs is not nagged.
 */
export function SetupCard() {
  const { known, steps } = useSetupProgress();

  if (!known || steps.every((step) => step.done || !step.required)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-faint p-3 group-data-[collapsible=icon]:hidden">
      <p className="font-medium text-xs">Finish setting up</p>

      <ul className="flex flex-col gap-1">
        {steps.map((step) => (
          <li key={step.to}>
            <Link
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                step.done
                  ? "text-muted-foreground/70"
                  : "text-muted-foreground hover:text-foreground"
              )}
              to={step.to}
            >
              {step.done ? (
                <CheckCircleIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-success"
                  weight="fill"
                />
              ) : (
                <CircleDashedIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0"
                />
              )}
              <span className={cn(step.done && "line-through")}>
                {step.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
