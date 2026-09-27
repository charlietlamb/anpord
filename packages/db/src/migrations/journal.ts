import { Schema } from "effect";

const JournalEntry = Schema.Struct({
  breakpoints: Schema.Boolean,
  idx: Schema.Int,
  tag: Schema.String,
  version: Schema.String,
  when: Schema.Int,
});

export const Journal = Schema.Struct({
  dialect: Schema.String,
  entries: Schema.Array(JournalEntry),
  version: Schema.String,
});
export type Journal = typeof Journal.Type;

const assertJournal: (input: unknown) => asserts input is Journal =
  Schema.asserts(Journal);

export const parseJournal = (text: string): Journal => {
  const parsed: unknown = JSON.parse(text);
  assertJournal(parsed);
  return parsed;
};

export const printJournal = (journal: Journal) =>
  `${JSON.stringify(journal, null, 2)}\n`;

const dateOf = (when: number) => new Date(when).toISOString();

const TAG = /^(\d{4})_[a-z0-9_]+$/;

const SQL_FILE = /\.sql$/;

export interface JournalProblem {
  readonly kind:
    | "misnumbered"
    | "misnamed"
    | "repeated"
    | "misdated"
    | "missing-file"
    | "unlisted-file";
  readonly message: string;
}

export const journalProblems = (
  journal: Journal,
  sqlFiles: readonly string[]
): readonly JournalProblem[] => {
  const problems: JournalProblem[] = [];
  const tags = new Set<string>();

  for (const [position, entry] of journal.entries.entries()) {
    const previous = journal.entries[position - 1];

    if (entry.idx !== position) {
      problems.push({
        kind: "misnumbered",
        message: `${entry.tag} is entry ${position} of the journal but says it is ${entry.idx}.`,
      });
    }
    if (TAG.exec(entry.tag)?.[1] !== String(position).padStart(4, "0")) {
      problems.push({
        kind: "misnamed",
        message: `${entry.tag} is entry ${position} of the journal, so its name should start with ${String(position).padStart(4, "0")}_ and use only lowercase letters, digits and underscores.`,
      });
    }
    if (tags.has(entry.tag)) {
      problems.push({
        kind: "repeated",
        message: `${entry.tag} is in the journal twice.`,
      });
    }
    tags.add(entry.tag);

    if (previous !== undefined && entry.when <= previous.when) {
      problems.push({
        kind: "misdated",
        message: `${entry.tag} is dated ${dateOf(entry.when)}, no later than ${previous.tag} at ${dateOf(previous.when)}, so drizzle would skip it on any database that has ${previous.tag}. Set its "when" in drizzle/meta/_journal.json to ${previous.when + 1}.`,
      });
    }
    if (!sqlFiles.includes(`${entry.tag}.sql`)) {
      problems.push({
        kind: "missing-file",
        message: `${entry.tag} is in the journal but drizzle/${entry.tag}.sql is missing.`,
      });
    }
  }

  for (const file of sqlFiles) {
    if (!tags.has(file.replace(SQL_FILE, ""))) {
      problems.push({
        kind: "unlisted-file",
        message: `drizzle/${file} is not in the journal, so it never runs. Delete it and run bun run db:generate.`,
      });
    }
  }

  return problems;
};

export const withOrderedLastEntry = (journal: Journal): Journal => {
  const last = journal.entries.at(-1);
  const previous = journal.entries.at(-2);

  if (
    last === undefined ||
    previous === undefined ||
    last.when > previous.when
  ) {
    return journal;
  }

  return {
    ...journal,
    entries: [
      ...journal.entries.slice(0, -1),
      { ...last, when: previous.when + 1 },
    ],
  };
};
