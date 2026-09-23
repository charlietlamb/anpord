export interface DefinitionFields {
  readonly prepareSource: string | null;
  readonly repoRef: string | null;
  readonly repoUrl: string | null;
  readonly sourceFiles: unknown;
  readonly sourceKind: string | null;
  readonly user: unknown;
  readonly validatorConfig: unknown;
  readonly validatorSource: string | null;
  readonly verifyCommand: string | null;
}

const PARTS: readonly (readonly [
  string,
  (row: DefinitionFields) => unknown,
])[] = [
  [
    "source",
    (row) => [row.sourceKind, row.sourceFiles, row.repoUrl, row.repoRef],
  ],
  ["setup", (row) => row.prepareSource],
  ["validator", (row) => [row.validatorSource, row.validatorConfig]],
  ["verifier", (row) => row.verifyCommand],
  ["simulated user", (row) => row.user],
];

export const changesBetween = (
  before: DefinitionFields,
  after: DefinitionFields
): readonly string[] =>
  PARTS.filter(
    ([, read]) => JSON.stringify(read(before)) !== JSON.stringify(read(after))
  ).map(([part]) => part);
