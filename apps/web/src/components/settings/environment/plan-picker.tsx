import type { SubscriptionPlan } from "@sphynx/schema/domain/credentials";
import { harnessPresentation } from "@sphynx/ui/components/evals/variant-presentation";
import { cn } from "@sphynx/ui/lib/utils";
import { PLAN_ORDER, PLANS } from "@/lib/settings/subscription-plans";

export function PlanPicker({
  onChange,
  value,
}: {
  readonly onChange: (plan: SubscriptionPlan) => void;
  readonly value: SubscriptionPlan;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="sr-only">Plan</legend>
      {PLAN_ORDER.map((plan) => {
        const copy = PLANS[plan];
        const { Icon } = harnessPresentation(copy.harness);
        const checked = plan === value;

        return (
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors duration-150 ease-out has-focus-visible:ring-4 has-focus-visible:ring-ring/20",
              checked
                ? "border-foreground/40 bg-alpha-4"
                : "border-border hover:bg-alpha-4"
            )}
            key={plan}
          >
            <input
              checked={checked}
              className="sr-only"
              name="subscription-plan"
              onChange={() => onChange(plan)}
              type="radio"
              value={plan}
            />
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium text-foreground text-sm">
                {copy.label}
              </span>
              <span className="text-muted-foreground text-xs">
                {copy.blurb}
              </span>
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "size-3.5 shrink-0 rounded-full border",
                checked ? "border-4 border-foreground" : "border-border"
              )}
            />
          </label>
        );
      })}
    </fieldset>
  );
}
