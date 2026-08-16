import { readFileSync, writeFileSync } from "node:fs";

/**
 * Rewrites `catalog:` specifiers in a package manifest to the versions the root
 * catalog names.
 *
 * Bun resolves them for the workspace but publishes them verbatim, and npm has
 * no idea what a `catalog:` protocol is: installing such a package fails with
 * EUNSUPPORTEDPROTOCOL before a single file is written. The manifest is
 * rewritten in place before packing and restored afterwards.
 */
const [manifestPath, mode] = process.argv.slice(2);

if (manifestPath === undefined) {
  throw new Error("Usage: resolve-catalog.mjs <package.json> [restore]");
}

const backupPath = `${manifestPath}.catalog`;

if (mode === "restore") {
  writeFileSync(manifestPath, readFileSync(backupPath, "utf8"));
  process.exit(0);
}

const original = readFileSync(manifestPath, "utf8");
writeFileSync(backupPath, original);

const catalog =
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
    .catalog ?? {};
const manifest = JSON.parse(original);
const resolved = [];

for (const field of ["dependencies", "peerDependencies"]) {
  for (const [name, specifier] of Object.entries(manifest[field] ?? {})) {
    if (specifier !== "catalog:") {
      continue;
    }
    const version = catalog[name];
    if (version === undefined) {
      throw new Error(`${name} is not in the root catalog`);
    }
    manifest[field][name] = `^${version}`;
    resolved.push(`${name}@^${version}`);
  }
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`resolved ${resolved.join(", ")}\n`);
