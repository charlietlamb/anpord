export const ID_PREFIXES = {
  channel: "chl",
  evalCell: "cel",
  evalEvent: "evt",
  evalRun: "run",
  evalRunInternal: "runx",
  evalTask: "tsk",
  evalTrial: "trl",
  channelEvent: "chev",
  member: "mem",
  organization: "org",
  prompt: "pmt",
  promptChannel: "chn",
  promptRelease: "rel",
  promptVersion: "ver",
} as const;

export type IdEntity = keyof typeof ID_PREFIXES;
