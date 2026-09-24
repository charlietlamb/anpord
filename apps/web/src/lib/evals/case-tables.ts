export const CASES_TABLE = {
  columns: "minmax(0,2fr) minmax(0,1fr) 6.5rem 8.5rem 4.5rem 5.5rem 1rem",
  headings: ["Case", "Suite", "Variants", "Status", "Runs", "Last run"],
  label: "Cases",
} as const;

export const CASE_RUNS_TABLE = {
  columns: "minmax(0,16rem) minmax(0,1fr) minmax(0,15rem) 7.5rem 5.5rem 1rem",
  headings: ["Variant", "Result", "Source", "Status", "Time"],
  label: "Runs of this case",
} as const;

export const CHECKS_TABLE = {
  columns: "minmax(0,14rem) minmax(0,1fr) 4.5rem 6.5rem 1rem",
  headings: ["Check", "Result", "Time", "Status"],
  label: "Checks on this trial",
} as const;

export const CALLS_TABLE = {
  columns: "1.5rem minmax(0,1fr) 5rem",
  headings: ["#", "Call", "Time"],
  label: "Calls in this trial",
} as const;

export const FILES_TABLE = {
  columns: "minmax(0,1fr) 5rem 7.5rem 1rem",
  headings: ["File", "Size", "Contents"],
  label: "Files this trial changed",
} as const;

export const VERIFY_TABLE = {
  columns: "minmax(0,1fr) 7.5rem",
  headings: ["Step", "Status"],
  label: "Verify steps",
} as const;

export const STEPS_TABLE = {
  columns: "minmax(0,1fr)",
  headings: ["Step"],
  label: "Steps in the order they were recorded",
} as const;
