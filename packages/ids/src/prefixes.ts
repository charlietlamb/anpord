/* Never rename a prefix: it is stored in rows and in customer integrations.
   Organizations and members are absent because Better Auth's generator owns
   those tables. */
export const ID_PREFIXES = {
  channel: "chl",
  credentialAuthAttempt: "caa",
  credentialConnection: "con",
  evalCase: "ecas",
  evalBatch: "bat",
  evalCaseVersion: "ecv",
  evalEvent: "evt",
  evalHarnessProfile: "hpf",
  evalRun: "run",
  evalSuite: "esui",
  evalTrial: "trl",
  evalTrialCost: "tcst",
  evalVariant: "evar",
  prompt: "pmt",
  promptChannel: "chn",
  promptEvent: "pev",
  promptRelease: "rel",
  promptVersion: "ver",
} as const;

export type IdEntity = keyof typeof ID_PREFIXES;
