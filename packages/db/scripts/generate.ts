import { spawnSync } from "node:child_process";
import { relative } from "node:path";
import { dataLossIn } from "../src/migrations/data-loss";
import { migrationsFolder, PACKAGE_ROOT } from "../src/migrations/folder";
import { withOrderedLastEntry } from "../src/migrations/journal";

const folder = migrationsFolder();
const before = folder.journal().entries.length;

const generated = spawnSync(
  "bunx",
  [
    "drizzle-kit",
    "generate",
    "--config",
    "drizzle.config.ts",
    ...process.argv.slice(2),
  ],
  { cwd: PACKAGE_ROOT, stdio: "inherit" }
);
if (generated.status !== 0) {
  process.exit(generated.status ?? 1);
}

const journal = folder.journal();
const added = journal.entries.at(-1);
if (journal.entries.length === before || added === undefined) {
  process.exit(0);
}

folder.writeJournal(withOrderedLastEntry(journal));

const files = [
  "drizzle/meta/_journal.json",
  `drizzle/meta/${added.tag.slice(0, 4)}_snapshot.json`,
];
spawnSync("bunx", ["biome", "format", "--write", ...files], {
  cwd: PACKAGE_ROOT,
  stdio: "ignore",
});

const sqlPath = `${folder.root}/${added.tag}.sql`;
const losses = dataLossIn(folder.migrations().at(-1)?.sql ?? "");
console.log(`\nRead ${relative(process.cwd(), sqlPath)} before you migrate.`);
if (losses.length > 0) {
  console.log(
    `It loses data:\n${losses.map((loss) => `  ${loss.effect}: ${loss.statement}`).join("\n")}\nIf that is intended, add "${added.tag}": "<what is lost and why that is fine>" to drizzle/data-loss.json. bun run check fails until you do.`
  );
}
