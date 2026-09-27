import { type Inspection, indented } from "./inspect";

const refusalLines = (inspection: Inspection) =>
  inspection.problems.length > 0
    ? [`Migrate would refuse:\n${indented(inspection.problems)}`]
    : [
        inspection.pending.length === 0
          ? "Up to date. Migrate has nothing to do."
          : `Migrate would apply ${inspection.pending.length} migration${inspection.pending.length === 1 ? "" : "s"}.`,
      ];

const lossLines = (inspection: Inspection) =>
  inspection.losses.length > 0
    ? [`Data loss in pending migrations:\n${indented(inspection.losses)}`]
    : [];

export const statusReport = (inspection: Inspection) =>
  [
    `Database: ${inspection.target}`,
    `Applied: ${inspection.applied} of ${inspection.total} migrations`,
    `Pending: ${inspection.pending.length === 0 ? "none" : inspection.pending.join(", ")}`,
    ...(inspection.edited.length > 0
      ? [`Changed after they were applied: ${inspection.edited.join(", ")}`]
      : []),
    ...lossLines(inspection),
    ...refusalLines(inspection),
  ].join("\n");

export const dryRunReport = (inspection: Inspection) =>
  [
    `Dry run against ${inspection.target}. Nothing was written.`,
    ...(inspection.pending.length > 0
      ? [
          `Pending SQL, in order:\n${indented(inspection.pending.map((tag) => `packages/db/drizzle/${tag}.sql`))}`,
        ]
      : []),
    ...lossLines(inspection),
    ...refusalLines(inspection),
  ].join("\n");
