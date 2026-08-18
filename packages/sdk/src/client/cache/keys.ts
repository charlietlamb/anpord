import type { PromptSelector } from "./types";

const NAMESPACE = "prompt";
const LATEST = "latest";
const PRODUCTION = "production";

/** Which version a selector asks for, in the same shape the server's own key
 * uses, so the two schemes read alike when someone compares them. */
const selectorSegment = (selector: PromptSelector) => {
  if (selector.version !== undefined) {
    return `v:${selector.version}`;
  }
  const channel = selector.channel ?? PRODUCTION;
  return channel === LATEST ? LATEST : `c:${channel}`;
};

/**
 * What makes one cached answer different from another.
 *
 * `includeVersions` belongs here even though the server's key omits it: this
 * cache holds the response rather than the resolution, and a response asked
 * for without history has no `versions` to give to a caller who wanted it.
 */
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
