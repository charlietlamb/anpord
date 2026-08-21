import { Schema } from "effect";

/**
 * The `evals.json` an agent-skills repository already ships.
 *
 * a customer, Kortix and DeerFlow each write this shape under a different
 * directory, and none of them has a runner that reads it. Taking their format
 * rather than asking for ours is the whole adoption argument: the cases exist,
 * the file is already in the repository, and nothing executes it.
 */
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

/**
 * The two shapes found in the wild.
 *
 * Kortix and a customer both write `evals` with the same five fields, under
 * different directories. DeerFlow writes `cases` with a schema version and
 * its own vocabulary, including `forbidden_tool_actions`, which is PostHog's
 * NoToolCall and Onyx's ToolAssertion arrived at a third time independently.
 *
 * Only `prompt` and `id` are common, so those are what the union requires and
 * everything else is optional. Reading both is the point: the adapter is
 * written once and the set of repositories writing one of these grows without
 * us.
 */
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

/**
 * Reads a case file into cases.
 *
 * A calculation, not a service: same input, same cases, nothing to inject and
 * no production versus test variation.
 */
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
