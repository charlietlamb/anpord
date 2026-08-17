import type { PromptPlacements } from "@anpord/schema/domain/placements";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PlacementsScreen } from "@/components/placements/placements-screen";
import {
  type StagedChange,
  type StagedMap,
  stage,
  stagedKey,
  stageRowToLatest,
} from "@/lib/placements/staged-changes";

export const Route = createFileRoute("/dev/deployments")({
  component: PlacementsPreview,
});

/** Fixed so the screen renders identically on every visit rather than moving
 * with the clock. */
const EPOCH = new Date("2026-08-16T12:00:00.000Z");

const placement = (channel: string, version: number) => ({
  channel,
  updatedAt: EPOCH,
  updatedBy: { image: null, name: "Charlie Lamb" },
  version,
});

/** Every state a cell has: up to date, behind by one, far behind, never
 * pointed, and a prompt with no versions at all. */
const SEED = [
  {
    id: "welcome",
    latestVersion: 3,
    name: "Welcome message",
    placements: [placement("production", 1), placement("staging", 3)],
  },
  {
    id: "support-reply",
    latestVersion: 7,
    name: "Support reply",
    placements: [placement("production", 2)],
  },
  {
    id: "refund-policy",
    latestVersion: 1,
    name: "Refund policy",
    placements: [placement("production", 1)],
  },
  {
    id: "onboarding",
    latestVersion: 4,
    name: "Onboarding email",
    placements: [],
  },
  {
    id: "draft-only",
    latestVersion: null,
    name: "Draft only",
    placements: [],
  },
] as unknown as readonly PromptPlacements[];

const CHANNELS = ["production", "staging", "development"];

function PlacementsPreview() {
  const [staged, setStaged] = useState<StagedMap>(new Map());
  const [search, setSearch] = useState("");

  const rows = SEED.filter((row) =>
    row.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell sidebarOpen>
      <PlacementsScreen
        applying={false}
        changeFor={(promptId, channel) =>
          staged.get(stagedKey(promptId, channel))
        }
        channels={CHANNELS}
        error={null}
        hasMore={false}
        isLoadingMore={false}
        isPending={false}
        onApply={() => setStaged(new Map())}
        onDiscard={() => setStaged(new Map())}
        onLoadMore={() => undefined}
        onSearch={setSearch}
        onStage={(change: StagedChange) =>
          setStaged((current) => stage(current, change))
        }
        onStageLatest={(prompt) =>
          setStaged((current) => stageRowToLatest(current, prompt))
        }
        rows={rows}
        search={search}
        staged={staged}
        totals={{ behind: 2, prompts: SEED.length }}
      />
    </DashboardShell>
  );
}
