export const ID_PREFIXES = {
  channel: "chl",
  evalBaseline: "bas",
  evalCell: "cel",
  evalEvent: "evt",
  evalPlayground: "pgd",
  evalPlaygroundInternal: "pgdx",
  evalRun: "run",
  evalRunInternal: "runx",
  evalTask: "tsk",
  evalTrial: "trl",
  channelEvent: "chev",
  member: "mem",
  organization: "org",
  prompt: "pmt",
  promptChannel: "chn",
  promptEvent: "pev",
  promptRelease: "rel",
  promptVersion: "ver",
} as const;

export type IdEntity = keyof typeof ID_PREFIXES;
