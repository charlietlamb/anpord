import type { Subscription } from "@sphynx/schema/domain/credentials";
import { harnessPresentation } from "@sphynx/ui/components/evals/variant-presentation";
import { Badge } from "@sphynx/ui/components/ui/badge";
import { DataTableRow } from "@sphynx/ui/components/ui/data-table";
import { DestructiveMenuItem } from "@/components/layout/destructive-menu-item";
import { RowActionsMenu } from "@/components/layout/row-actions-menu";
import { LastUsedCell } from "@/components/settings/environment/last-used-cell";
import { UsedByBadges } from "@/components/settings/environment/used-by-badges";
import { scopeLabel } from "@/lib/settings/scopes";
import { PLANS } from "@/lib/settings/subscription-plans";

export function SubscriptionRow({
  onDisconnect,
  subscription,
}: {
  readonly onDisconnect: () => void;
  readonly subscription: Subscription;
}) {
  const plan = PLANS[subscription.plan];
  const harness = harnessPresentation(plan.harness);

  return (
    <DataTableRow>
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-foreground">{plan.label}</span>
        <Badge size="xs" variant="outline">
          Subscription
        </Badge>
      </span>

      <UsedByBadges
        uses={[{ id: plan.harness, kind: "harness", label: harness.label }]}
      />

      <span className="truncate text-muted-foreground">
        {subscription.renews ? "Renews itself" : "Pasted auth file"}
      </span>

      <span className="truncate text-muted-foreground">
        {scopeLabel(subscription.scope)}
      </span>

      <LastUsedCell at={subscription.lastUsedAt} />

      <RowActionsMenu label={`Actions for ${plan.label}`}>
        <DestructiveMenuItem onClick={onDisconnect}>
          Disconnect
        </DestructiveMenuItem>
      </RowActionsMenu>
    </DataTableRow>
  );
}
