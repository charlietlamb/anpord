import { createHash } from "node:crypto";
import type { StartBatchRequest } from "@sphynx/schema/domain/eval-definition";

const sortedKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortedKeys);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => (left < right ? -1 : 1))
        .map(([key, entry]) => [key, sortedKeys(entry)])
    );
  }
  return value;
};

export const startRequestHashOf = (request: StartBatchRequest): string =>
  createHash("sha256")
    .update(JSON.stringify(sortedKeys(request)))
    .digest("hex");
