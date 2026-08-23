import type { ModelDescription } from "../ports/model-source";
import type { RankedModel } from "./model-ranking";

export const describedBy = (
  ids: readonly string[],
  described: ReadonlyMap<string, ModelDescription>
): readonly RankedModel[] =>
  ids.map((id) => {
    const found = described.get(id);

    return {
      displayName: found?.displayName ?? id,
      id,
      releasedAt: found?.releasedAt ?? null,
      summary: found?.summary ?? null,
      vendor: found?.vendor ?? null,
    };
  });
