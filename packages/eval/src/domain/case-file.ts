import { Schema } from "effect";

/** The `evals.json` an agent-skills repository already ships. */
export const CaseFileEntry = Schema.Struct({
  assertions: Schema.optionalWith(Schema.Array(Schema.String), {
    default: () => [],
  }),
  expected_output: Schema.optionalWith(Schema.String, { default: () => "" }),
  files: Schema.optionalWith(Schema.Array(Schema.String), {
    default: () => [],
  }),
  id: Schema.optional(Schema.Union(Schema.Int, Schema.String)),
  prompt: Schema.String,
});

/** The two shapes found in the wild. */
export const CaseFile = Schema.Union(
  Schema.Struct({
    evals: Schema.Array(CaseFileEntry),
    skill_name: Schema.optionalWith(Schema.String, { default: () => "" }),
  }),
  Schema.Struct({
    cases: Schema.Array(CaseFileEntry),
    schema_version: Schema.optional(Schema.String),
    skill_name: Schema.optionalWith(Schema.String, { default: () => "" }),
  })
);
export type CaseFile = typeof CaseFile.Type;

const entriesOf = (file: CaseFile): readonly (typeof CaseFileEntry.Type)[] =>
  "evals" in file ? file.evals : file.cases;

export interface ImportedCase {
  readonly assertions: readonly string[];
  readonly expectation: string;
  readonly goal: string;
  readonly name: string;
  readonly ungated: boolean;
  readonly verify: string | null;
}

const nameOf = (
  entry: typeof CaseFileEntry.Type,
  skill: string,
  index: number
) => {
  const own = entry.id === undefined ? `${index + 1}` : String(entry.id);

  return skill === "" ? `case-${own}` : `${skill}-${own}`;
};

/** Reads a case file into cases. */
export const casesFrom = (file: CaseFile): readonly ImportedCase[] =>
  entriesOf(file).map((entry, index) => ({
    assertions: entry.assertions,
    expectation: entry.expected_output,
    goal: entry.prompt,
    name: nameOf(entry, file.skill_name, index),
    ungated: true,
    verify: null,
  }));

export const decodeCaseFile = Schema.decodeUnknown(CaseFile);
