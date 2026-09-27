import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Schema } from "effect";
import { dataLossIn } from "./data-loss";
import {
  type Journal,
  journalProblems,
  parseJournal,
  printJournal,
} from "./journal";
import type { Migration } from "./reconcile";

export const PACKAGE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const Acknowledged = Schema.Record({
  key: Schema.String,
  value: Schema.String,
});
const parseAcknowledged = Schema.decodeUnknownSync(
  Schema.parseJson(Acknowledged)
);

export const migrationsFolder = (root = join(PACKAGE_ROOT, "drizzle")) => {
  const journalPath = join(root, "meta", "_journal.json");
  const acknowledgedPath = join(root, "data-loss.json");

  const journal = () => parseJournal(readFileSync(journalPath, "utf8"));
  const sqlFiles = () =>
    readdirSync(root)
      .filter((file) => file.endsWith(".sql"))
      .sort();
  const acknowledged = () =>
    existsSync(acknowledgedPath)
      ? parseAcknowledged(readFileSync(acknowledgedPath, "utf8"))
      : {};

  const migrations = (): readonly Migration[] =>
    journal().entries.map((entry) => {
      const sql = readFileSync(join(root, `${entry.tag}.sql`), "utf8");
      return {
        hash: createHash("sha256").update(sql).digest("hex"),
        sql,
        tag: entry.tag,
        when: entry.when,
      };
    });

  const problems = (): readonly string[] => {
    const read = journal();
    const files = sqlFiles();
    const ordering = journalProblems(read, files);
    const orderingMessages = ordering.map((problem) => problem.message);
    if (ordering.some((problem) => problem.kind === "missing-file")) {
      return orderingMessages;
    }

    const known = acknowledged();
    const tags = new Set(read.entries.map((entry) => entry.tag));
    const unmarked = migrations().flatMap((migration) => {
      const losses = dataLossIn(migration.sql);
      return losses.length === 0 || known[migration.tag] !== undefined
        ? []
        : [
            `${migration.tag} ${losses.map((loss) => loss.effect).join(", ")}: ${losses[0]?.statement}. If that loss is intended, add "${migration.tag}": "<what is lost and why that is fine>" to drizzle/data-loss.json. Otherwise change the schema so nothing is dropped.`,
          ];
    });
    const stale = Object.keys(known)
      .filter((tag) => !tags.has(tag))
      .map(
        (tag) =>
          `drizzle/data-loss.json names ${tag}, which is not a migration. Remove it.`
      );

    return [...orderingMessages, ...unmarked, ...stale];
  };

  const writeJournal = (next: Journal) =>
    writeFileSync(journalPath, printJournal(next));

  return {
    acknowledged,
    journal,
    journalPath,
    migrations,
    problems,
    root,
    writeJournal,
  };
};
