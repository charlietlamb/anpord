#!/usr/bin/env bun

import { globSync, readFileSync } from "node:fs";

const MAX_BLOCK_LINES = 3;

const SCANNED = "{apps,packages}/*/src/**/*.{ts,tsx}";

/* Vendored, generated, or code-as-data: not ours to style. */
const EXEMPT = [
  "packages/ui/src/components/ui/",
  "routeTree.gen.ts",
  "/.trigger/",
  "node_modules/",
];

/* Functional directives and triple-slash compiler pragmas, which must survive
   as line comments. */
const DIRECTIVE = /^\s*(?:\/\/\s*biome-ignore|\/\/\/\s*<reference)/;

const LINE_COMMENT = /^\s*\/\//;

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly reason: string;
}

const withoutStrings = (source: string) =>
  source
    .replaceAll(/`(?:\\.|[^`\\])*`/gs, "``")
    .replaceAll(/"(?:\\.|[^"\\])*"/g, '""')
    .replaceAll(/'(?:\\.|[^'\\])*'/g, "''");

const findingsIn = (file: string, source: string): Finding[] => {
  const found: Finding[] = [];
  const lines = withoutStrings(source).split("\n");

  let blockStart = 0;
  let depth = 0;

  for (const [index, text] of lines.entries()) {
    const opens = text.includes("/*");
    const closes = text.includes("*/");

    if (opens && depth === 0) {
      blockStart = index;
      depth = 1;
    }

    if (closes && depth === 1) {
      const length = index - blockStart + 1;

      if (length > MAX_BLOCK_LINES) {
        found.push({
          file,
          line: blockStart + 1,
          reason: `${length}-line comment block; keep it to ${MAX_BLOCK_LINES} lines or fewer`,
        });
      }

      depth = 0;
    }

    if (LINE_COMMENT.test(text) && !DIRECTIVE.test(text)) {
      found.push({
        file,
        line: index + 1,
        reason: "line comment; this repo uses /* */ blocks only",
      });
    }
  }

  return found;
};

const scanned = globSync(SCANNED).filter(
  (file) => !EXEMPT.some((part) => file.includes(part))
);

const findings = scanned.flatMap((file) =>
  findingsIn(file, readFileSync(file, "utf8"))
);

if (findings.length > 0) {
  for (const finding of findings) {
    process.stderr.write(
      `${finding.file}:${finding.line}  ${finding.reason}\n`
    );
  }

  process.stderr.write(
    `\n${findings.length} comment issue${findings.length === 1 ? "" : "s"} in ${scanned.length} files.\nCode should read for itself. Prefer a clearer name or a smaller function; keep a comment only for a constraint the code cannot state, in one line.\n`
  );

  process.exit(1);
}

process.stdout.write(
  `Comment discipline clean across ${scanned.length} files.\n`
);
