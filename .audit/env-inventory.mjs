import { execFileSync } from "node:child_process";

const rev = process.argv[2] ?? "HEAD";
const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
const files = git("ls-tree", "-r", "--name-only", rev, "--", "apps", "packages", "scripts")
  .split("\n")
  .filter(
    (file) =>
      /\.(ts|tsx|mjs|js|cjs)$/.test(file) &&
      !/(^|\/)(dist|node_modules)\//.test(file) &&
      !file.startsWith("apps/docs/") &&
      !file.endsWith("routeTree.gen.ts")
  );

const ENV = String.raw`(?:process\.env|Bun\.env|import\.meta\.env)`;
const NOT_WRITTEN = String.raw`(?!\s*(?:=(?!=)|\+\+|--|[-+*/%&|^?]{1,3}=))`;
const named = new RegExp(
  String.raw`${ENV}(?:\.([A-Z_][A-Z0-9_]*)(?![A-Z0-9_])|\[\s*["'\`]([A-Z_][A-Z0-9_]*)["'\`]\s*\])${NOT_WRITTEN}`,
  "g"
);
const dynamic = new RegExp(
  String.raw`${ENV}\[\s*(?!["'\`])[^\]]+\]${NOT_WRITTEN}`,
  "g"
);
const destructured = new RegExp(
  String.raw`\{([^{}]*)\}\s*=\s*${ENV}(?![.\[\w])`,
  "g"
);
const config =
  /Config\.(?:string|redacted|integer|number|boolean|duration|url|literal)\(\s*"([A-Z_][A-Z0-9_]*)"/g;
const kind = (file) =>
  /\/tests?\/|\.test\./.test(file)
    ? "test"
    : /\/src\//.test(file)
      ? "src"
      : "script";

const readers = new Map();
const counts = { config: 0, dynamic: 0, script: 0, src: 0, test: 0 };
const record = (name, file) => {
  if (!readers.has(name)) {
    readers.set(name, new Set());
  }
  readers.get(name).add(file);
};
for (const file of files) {
  const text = git("show", `${rev}:${file}`);
  const where = kind(file);
  for (const match of text.matchAll(named)) {
    counts[where] += 1;
    record(match[1] ?? match[2], file);
  }
  for (const _ of text.matchAll(dynamic)) {
    counts[where] += 1;
    counts.dynamic += 1;
  }
  for (const match of text.matchAll(destructured)) {
    for (const entry of match[1].split(",")) {
      const name = entry.trim().match(/^([A-Z_][A-Z0-9_]*)\b/)?.[1];
      if (name) {
        counts[where] += 1;
        record(name, file);
      }
    }
  }
  for (const match of text.matchAll(config)) {
    counts.config += 1;
    record(match[1], file);
  }
}

const shared = [...readers]
  .filter(([, where]) => where.size > 1)
  .sort(([a], [b]) => a.localeCompare(b));
console.log(
  `raw env reads: src ${counts.src}, tests ${counts.test}, scripts ${counts.script} (${counts.dynamic} by computed key)`
);
console.log(`Config reads by name: ${counts.config}`);
console.log(`distinct env names: ${readers.size}`);
console.log(`env names read in more than one file: ${shared.length}`);
for (const [name, where] of shared) {
  console.log(`  ${name}\t${where.size}\t${[...where].join(" ")}`);
}
