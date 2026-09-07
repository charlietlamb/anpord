import type { HarnessName } from "../../domain/cell";
import type { ModelDescription } from "../../ports/model-source";

export const staticModels: Partial<
  Record<HarnessName, readonly [string, ...string[]]>
> = {
  claude: ["sonnet", "opus", "haiku"],
  /* Codex normally reports what it can reach from its own cache. That cache is
     written by the CLI in a user's home directory, so a server has none and
     would otherwise offer nothing at all. */
  codex: [
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "gpt-5.5",
    "gpt-5.4-mini",
    "gpt-5.3-codex-spark",
  ],
  cursor: ["auto"],
  gemini: ["gemini-2.5-pro", "gemini-2.5-flash"],
  qwen: ["qwen3-coder-plus"],
};

export const staticDescriptions = (harness: HarnessName) =>
  new Map<string, ModelDescription>(
    (staticModels[harness] ?? []).map((id) => [
      id,
      {
        displayName: id,
        releasedAt: null,
        summary: null,
        vendor: harness,
      },
    ])
  );
