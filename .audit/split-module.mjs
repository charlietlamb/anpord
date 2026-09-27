import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const [planPath] = process.argv.slice(2);
const plan = JSON.parse(readFileSync(planPath, "utf8"));
const sourceFile = plan.source;
const packageSpecifier = plan.specifier;
const sourceDir = dirname(sourceFile);
const sourceBase = basename(sourceFile, ".ts");
const lines = readFileSync(sourceFile, "utf8").split("\n");

const importLines = [];
let cursor = 0;
while (
  cursor < lines.length &&
  (lines[cursor].startsWith("import") || lines[cursor].trim() === "")
) {
  importLines.push(lines[cursor]);
  cursor += 1;
}
const imports = importLines
  .join("\n")
  .match(/import[\s\S]*?from "[^"]+";/g)
  .map((statement) => {
    const from = statement.match(/from "([^"]+)"/)[1];
    const names = statement
      .replace(/^import\s*(type\s*)?\{?/, "")
      .replace(/\}?\s*from[\s\S]*$/, "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    return { from, names, typeOnly: /^import type/.test(statement) };
  });

const declaration = /^(export |const |type |interface |function )/;
const chunks = [];
let current = [];
for (const line of lines.slice(cursor)) {
  if (declaration.test(line) && current.some((l) => declaration.test(l))) {
    const lastBlank = current.map((l) => l.trim() === "").lastIndexOf(true);
    const carried = current.splice(lastBlank + 1);
    chunks.push(current);
    current = carried;
  }
  current.push(line);
}
chunks.push(current);

const declared = (chunk) =>
  [
    ...chunk
      .join("\n")
      .matchAll(/^(?:export )?(?:const|type|interface|function|class) (\w+)/gm),
  ].map((m) => m[1]);

const moduleOf = new Map();
for (const [module, names] of Object.entries(plan.modules)) {
  for (const name of names) {
    moduleOf.set(name, module);
  }
}
const byModule = new Map();
const home = new Map();
for (const chunk of chunks) {
  const names = declared(chunk);
  const module = names.map((n) => moduleOf.get(n)).find(Boolean) ?? sourceBase;
  for (const name of names) {
    home.set(name, module);
  }
  if (!byModule.has(module)) {
    byModule.set(module, []);
  }
  byModule.get(module).push(chunk.join("\n").replace(/\n+$/, ""));
}

const uses = (text, name) => new RegExp(`(?<![\\w.])${name}\\b`).test(text);
const exportedAcross = new Set();
for (const [module, bodies] of byModule) {
  const text = bodies.join("\n\n");
  for (const [name, owner] of home) {
    if (owner !== module && uses(text, name)) {
      exportedAcross.add(name);
    }
  }
}

for (const [module, bodies] of byModule) {
  let text = bodies.join("\n\n");
  for (const name of exportedAcross) {
    if (home.get(name) === module) {
      text = text.replace(
        new RegExp(`^(const|type|interface) ${name}\\b`, "gm"),
        `export $1 ${name}`
      );
    }
  }
  const header = [];
  for (const statement of imports) {
    const kept = statement.names.filter((spec) =>
      uses(
        text,
        spec
          .split(/\s+as\s+/)
          .pop()
          .replace(/^type\s+/, "")
      )
    );
    if (kept.length > 0) {
      header.push(
        `import ${statement.typeOnly ? "type " : ""}{ ${kept.join(", ")} } from "${statement.from}";`
      );
    }
  }
  const siblings = new Map();
  for (const [name, owner] of home) {
    if (owner !== module && uses(text, name)) {
      if (!siblings.has(owner)) {
        siblings.set(owner, []);
      }
      siblings.get(owner).push(name);
    }
  }
  for (const [owner, names] of siblings) {
    header.push(`import { ${names.sort().join(", ")} } from "./${owner}";`);
  }
  writeFileSync(
    join(sourceDir, `${module}.ts`),
    `${header.join("\n")}\n\n${text}\n`
  );
}

const packageRoot = plan.packageRoot;
const files = execFileSync(
  "git",
  ["ls-files", "--", "apps", "packages", "scripts"],
  { encoding: "utf8" }
)
  .split("\n")
  .filter(
    (file) =>
      /\.(ts|tsx)$/.test(file) &&
      !file.startsWith(sourceFile.replace(/\.ts$/, ""))
  );
const importPattern =
  /(import|export)(\s+type)?\s*\{([^}]*)\}\s*from\s*"([^"]+)";\n?/g;
let rewritten = 0;
for (const file of files) {
  const original = readFileSync(file, "utf8");
  const next = original.replace(
    importPattern,
    (statement, keyword, typeKeyword, list, from) => {
      const resolved = from.startsWith(".") ? join(dirname(file), from) : null;
      const targetsSource =
        from === packageSpecifier || resolved === join(sourceDir, sourceBase);
      if (!targetsSource) {
        return statement;
      }
      const groups = new Map();
      for (const raw of list
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)) {
        const name = raw.replace(/^type\s+/, "").split(/\s+as\s+/)[0];
        const owner = home.get(name);
        if (owner === undefined) {
          throw new Error(`${file}: ${name} is not declared in ${sourceFile}`);
        }
        if (!groups.has(owner)) {
          groups.set(owner, []);
        }
        groups.get(owner).push(raw);
      }
      return [...groups]
        .map(([owner, names]) => {
          const specifier = from.startsWith(".")
            ? (() => {
                const path = relative(dirname(file), join(sourceDir, owner));
                return path.startsWith(".") ? path : `./${path}`;
              })()
            : from.replace(new RegExp(`${sourceBase}$`), owner);
          return `${keyword}${typeKeyword ?? ""} { ${names.join(", ")} } from "${specifier}";\n`;
        })
        .join("");
    }
  );
  if (next !== original) {
    writeFileSync(file, next);
    rewritten += 1;
  }
}

const manifestPath = join(packageRoot, "package.json");
const manifest = readFileSync(manifestPath, "utf8");
const exportKey = `"${packageSpecifier.replace(/^@[^/]+\/[^/]+/, ".")}"`;
const line = manifest.split("\n").find((l) => l.includes(`${exportKey}:`));
const additions = [...byModule.keys()]
  .filter((module) => module !== sourceBase)
  .map((module) => line.replaceAll(sourceBase, module));
writeFileSync(
  manifestPath,
  manifest.replace(line, [...additions, line].sort().join("\n"))
);
console.log(
  `modules: ${[...byModule.keys()].join(", ")}; exported across: ${[...exportedAcross].join(", ")}; importers rewritten: ${rewritten}`
);
