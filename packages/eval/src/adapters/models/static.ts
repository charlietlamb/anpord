import type { HarnessName } from "../../domain/cell";
import type { ModelDescription } from "../../ports/model-source";

export const staticModels: Partial<
  Record<HarnessName, readonly [string, ...string[]]>
> = {
  claude: ["sonnet", "opus", "haiku"],
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
