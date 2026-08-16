export const ID_PREFIXES = {
  channelEvent: "chev",
  member: "mem",
  organization: "org",
  prompt: "pmt",
  promptChannel: "chn",
  promptVersion: "ver",
} as const;

export type IdEntity = keyof typeof ID_PREFIXES;
