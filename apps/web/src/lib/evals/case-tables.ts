export const CASES_TABLE = {
  columns: "minmax(0,1fr) minmax(0,11rem) 8.5rem 4.5rem 5.5rem 1rem",
  headings: ["Case", "Variant", "Status", "Runs", "Last run"],
  label: "Cases",
} as const;

export const CASE_HISTORY_TABLE = {
  columns: "minmax(0,12rem) minmax(0,1fr) minmax(0,11rem) 7.5rem 5.5rem 1rem",
  headings: ["Variant", "Result", "Source", "Status", "Time"],
  label: "Trials and edits of this case",
} as const;
