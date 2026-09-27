export interface DataLoss {
  readonly effect: string;
  readonly statement: string;
}

const LOSSES: readonly (readonly [RegExp, string])[] = [
  [/\bdrop\s+table\b/i, "drops a table"],
  [/\bdrop\s+column\b/i, "drops a column"],
  [/\bdrop\s+schema\b/i, "drops a schema"],
  [/\btruncate\b/i, "empties a table"],
  [/\bdelete\s+from\b/i, "deletes rows"],
  [
    /\balter\s+column\s+\S+\s+(?:set\s+data\s+)?type\b/i,
    "changes a column's type",
  ],
];

const withoutComments = (sql: string) =>
  sql.replaceAll(/--[^\n]*/g, "").replaceAll(/\/\*[\s\S]*?\*\//g, "");

const oneLine = (statement: string) => statement.replaceAll(/\s+/g, " ").trim();

export const dataLossIn = (sql: string): readonly DataLoss[] =>
  withoutComments(sql)
    .split(";")
    .map(oneLine)
    .flatMap((statement) =>
      LOSSES.filter(([pattern]) => pattern.test(statement)).map(
        ([, effect]) => ({ effect, statement })
      )
    );
