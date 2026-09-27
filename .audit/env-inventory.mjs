import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const root = process.argv[2] ?? ".";
const files = execFileSync(
  "git",
  ["-C", root, "ls-files", "--", "apps", "packages", "scripts"],
  {
    encoding: "utf8",
  }
)
  .split("\n")
  .filter(
    (file) =>
      /\.(ts|tsx|mjs|js|cjs)$/.test(file) &&
      !file.startsWith("apps/docs/") &&
      !file.endsWith("routeTree.gen.ts")
  );

const raw =
  /(?:process\.env|Bun\.env|import\.meta\.env)(?:\.([A-Z_][A-Z0-9_]*)|\[\s*"([A-Z_][A-Z0-9_]*)"\s*\])/g;
const config =
  /Config\.(?:string|redacted|integer|number|boolean|duration|url|literal)\(\s*"([A-Z_][A-Z0-9_]*)"/g;
const kind = (file) =>
  /\/tests?\/|\.test\./.test(file)
    ? "test"
    : /\/src\//.test(file)
      ? "src"
      : "script";

const readers = new Map();
const counts = { config: 0, rawScript: 0, rawSrc: 0, rawTest: 0 };
for (const file of files) {
  const text = readFileSync(`${root}/${file}`, "utf8");
  for (const match of text.matchAll(raw)) {
    const name = match[1] ?? match[2];
    const where = kind(file);
    counts[
      where === "src" ? "rawSrc" : where === "test" ? "rawTest" : "rawScript"
    ] += 1;
    if (!readers.has(name)) {
      readers.set(name, new Set());
    }
    readers.get(name).add(file);
  }
  for (const match of text.matchAll(config)) {
    counts.config += 1;
    if (!readers.has(match[1])) {
      readers.set(match[1], new Set());
    }
    readers.get(match[1]).add(file);
  }
}

const shared = [...readers]
  .filter(([, where]) => where.size > 1)
  .sort(([a], [b]) => a.localeCompare(b));
console.log(
  `raw env reads: src ${counts.rawSrc}, tests ${counts.rawTest}, scripts ${counts.rawScript}`
);
console.log(`Config reads by name: ${counts.config}`);
console.log(`distinct env names: ${readers.size}`);
console.log(`env names read in more than one file: ${shared.length}`);
for (const [name, where] of shared) {
  console.log(`  ${name}\t${where.size}\t${[...where].join(" ")}`);
}
