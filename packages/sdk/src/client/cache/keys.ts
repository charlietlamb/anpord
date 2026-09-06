import type { PromptSelector } from "./types";

const NAMESPACE = "prompt";

/** No channel is its own segment, never a guessed name: the server decides
 * which channel answers and may rename or drop it. */
const selectorSegment = (selector: PromptSelector) => {
  if (selector.version !== undefined) {
    return `v:${selector.version}`;
  }
  return selector.channel === undefined ? "default" : `c:${selector.channel}`;
};

/** `includeVersions` is part of the key even though the server's is not: this
 * caches the response, and a bare one has no `versions` to hand back. */
export const promptKey = (selector: PromptSelector) =>
  [
    NAMESPACE,
    encodeURIComponent(selector.id),
    selectorSegment(selector),
    selector.includeVersions === true ? "full" : "bare",
  ].join(":");

/** Every key for one prompt, so a write invalidates all of them. */
export const promptPrefix = (id: string) =>
  `${NAMESPACE}:${encodeURIComponent(id)}:`;
