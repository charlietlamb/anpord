import type { PromptSelector } from "./types";

const NAMESPACE = "prompt";

/**
 * Which version a selector asks for.
 *
 * Asking for no channel is its own selector rather than a named one: the
 * organisation decides which channel answers, it can rename or drop that
 * channel, and naming a guess here would key the answer under a channel the
 * server never resolved.
 */
const selectorSegment = (selector: PromptSelector) => {
  if (selector.version !== undefined) {
    return `v:${selector.version}`;
  }
  return selector.channel === undefined ? "default" : `c:${selector.channel}`;
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
