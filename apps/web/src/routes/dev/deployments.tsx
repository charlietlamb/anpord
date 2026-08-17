import type { Deployment } from "@anpord/schema/domain/deployments";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DeploymentsScreen } from "@/components/deployments/deployments-screen";

export const Route = createFileRoute("/dev/deployments")({
  component: DeploymentsPreview,
});

/** Fixed so the screen renders identically on every visit rather than moving
 * with the clock. */
const EPOCH = new Date("2026-08-16T12:00:00.000Z");

const minutesBefore = (minutes: number) =>
  new Date(EPOCH.getTime() - minutes * 60 * 1000);

const charlie = { image: null, name: "Charlie Lamb" };

/** One of every kind, plus a deployment whose author has since been deleted,
 * because those are the branches that are tedious to produce against real data
 * and the ones most likely to break unnoticed. */
const SEED: readonly Deployment[] = [
  {
    channel: "production",
    deployedAt: minutesBefore(4),
    deployedBy: charlie,
    fromVersion: 4,
    id: "chev_PREVIEW1",
    kind: "promotion",
    promptId: "support-reply",
    promptName: "Support reply",
    toVersion: 5,
  },
  {
    channel: "production",
    deployedAt: minutesBefore(52),
    deployedBy: charlie,
    fromVersion: 7,
    id: "chev_PREVIEW2",
    kind: "rollback",
    promptId: "support-reply",
    promptName: "Support reply",
    toVersion: 5,
  },
  {
    channel: "staging",
    deployedAt: minutesBefore(180),
    deployedBy: null,
    fromVersion: 6,
    id: "chev_PREVIEW3",
    kind: "repeat",
    promptId: "onboarding-email",
    promptName: "Onboarding email",
    toVersion: 6,
  },
  {
    channel: "beta",
    deployedAt: minutesBefore(1440),
    deployedBy: charlie,
    fromVersion: null,
    id: "chev_PREVIEW4",
    kind: "first",
    promptId: "onboarding-email",
    promptName: "Onboarding email",
    toVersion: 1,
  },
] as unknown as readonly Deployment[];

function DeploymentsPreview() {
  return (
    <DashboardShell sidebarOpen>
      <DeploymentsScreen
        channel=""
        error={null}
        hasMore={false}
        isLoadingMore={false}
        isPending={false}
        onChannelChange={() => undefined}
        onClearPrompt={() => undefined}
        onLoadMore={() => undefined}
        prompt=""
        rows={SEED}
      />
    </DashboardShell>
  );
}
