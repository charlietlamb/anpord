import { describe, expect, test } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sdk = fileURLToPath(new URL("../../", import.meta.url));
const dist = join(sdk, "dist");
const manifest = JSON.parse(readFileSync(join(sdk, "package.json"), "utf8"));
const EVE_IMPORT = /(?:from |import\(|require\()\s*["']eve(?:\/[^"']*)?["']/;
const LOCAL_IMPORT = /(?:from |import\(|require\()\s*["']\.\/([^"']+)["']/g;

const importsEve = (file: string, seen = new Set<string>()): boolean => {
  if (seen.has(file) || !existsSync(join(dist, file))) {
    return false;
  }

  seen.add(file);
  const source = readFileSync(join(dist, file), "utf8");

  return (
    EVE_IMPORT.test(source) ||
    [...source.matchAll(LOCAL_IMPORT)].some(([, chunk]) =>
      importsEve(chunk ?? "", seen)
    )
  );
};

const probe = `
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const loaded = [
  typeof (await import("anpord")).suite,
  typeof (await import("anpord/runner")).createEmitter,
  typeof require("anpord").suite,
  typeof require("anpord/runner").createEmitter,
];
const eve = await import("anpord/runner/eve").then(
  () => "loaded",
  (error) => error.message.match(/Cannot find package .([^']+)./)?.[1]
);
console.log(JSON.stringify({ eve, loaded }));
`;

const installedWithoutEve = () => {
  const root = mkdtempSync(join(tmpdir(), "anpord-no-eve-"));
  const modules = join(root, "node_modules");
  const anpord = join(modules, "anpord");

  mkdirSync(anpord, { recursive: true });
  cpSync(dist, join(anpord, "dist"), { recursive: true });
  cpSync(join(sdk, "package.json"), join(anpord, "package.json"));

  for (const name of Object.keys(manifest.dependencies)) {
    const target = join(modules, name);
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(realpathSync(join(sdk, "node_modules", name)), target);
  }

  return root;
};

describe.if(existsSync(join(dist, "runner-eve.mjs")))(
  "the built package without eve installed",
  () => {
    test("the import graphs of index and runner reach no eve while runner/eve does", () => {
      const entries = [
        "index.mjs",
        "index.cjs",
        "runner.mjs",
        "runner.cjs",
        "runner-eve.mjs",
        "runner-eve.cjs",
      ];

      expect(entries.filter((entry) => importsEve(entry))).toEqual([
        "runner-eve.mjs",
        "runner-eve.cjs",
      ]);
    });

    test("anpord and anpord/runner load and only anpord/runner/eve needs eve", () => {
      const root = installedWithoutEve();

      try {
        const run = Bun.spawnSync(
          ["node", "--input-type=module", "-e", probe],
          { cwd: root, stderr: "pipe" }
        );

        expect(run.stderr.toString()).toBe("");
        expect(JSON.parse(run.stdout.toString())).toEqual({
          eve: "eve",
          loaded: ["function", "function", "function", "function"],
        });
      } finally {
        rmSync(root, { force: true, recursive: true });
      }
    }, 60_000);
  }
);
