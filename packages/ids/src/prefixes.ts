/**
 * Prefixes make an id self-describing in logs, URLs and support requests, and
 * make it impossible to pass a version id where a prompt id belongs.
 *
 * Prefixes are permanent: they appear in stored rows and customer integrations,
 * so add new ones rather than renaming existing ones.
 */
export const ID_PREFIXES = {
  channelEvent: "chev",
  prompt: "pmt",
  promptChannel: "chn",
  promptVersion: "ver",
} as const;

export type IdEntity = keyof typeof ID_PREFIXES;
export type IdPrefix = (typeof ID_PREFIXES)[IdEntity];
