export const ID_PREFIXES = {
  channel: "chl",
  credentialAuthAttempt: "caa",
  credentialConnection: "con",
  evalBaseline: "bas",
  evalCell: "cel",
  evalEvent: "evt",
  evalPlayground: "pgd",
  evalPlaygroundInternal: "pgdx",
  evalRun: "run",
  evalRunInternal: "runx",
  evalTask: "tsk",
  evalTrial: "trl",
  member: "mem",
  organization: "org",
  prompt: "pmt",
  promptChannel: "chn",
  promptEvent: "pev",
  promptRelease: "rel",
  promptVersion: "ver",
} as const;

export type IdEntity = keyof typeof ID_PREFIXES;
