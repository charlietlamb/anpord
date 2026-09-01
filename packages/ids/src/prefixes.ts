/* Domain entities only. Organizations and members are Better Auth's tables:
   its plugins write them as well, so its generator defines their shape. */
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
  evalTrialCost: "tcst",
  prompt: "pmt",
  promptChannel: "chn",
  promptEvent: "pev",
  promptRelease: "rel",
  promptVersion: "ver",
} as const;

export type IdEntity = keyof typeof ID_PREFIXES;
