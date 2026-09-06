/* Never rename a prefix: it is stored in rows and in customer integrations.
   Organizations and members are absent because Better Auth's generator owns
   those tables. */
export const ID_PREFIXES = {
  channel: "chl",
  credentialAuthAttempt: "caa",
  credentialConnection: "con",
  evalBaseline: "bas",
  evalCell: "cel",
  evalEvent: "evt",
  evalHarnessProfile: "hpf",
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
