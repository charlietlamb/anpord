import { existsSync, readdirSync, readFileSync } from "node:fs";

/**
 * Every workspace package the server image needs at runtime, transitively.
 *
 * Copying a manifest installs a package's dependencies in the build stage, but
 * the release stage copies node_modules per member. One that is imported and
 * not copied builds and pushes cleanly, then dies at startup on a missing
 * package, which App Runner sees only as a failed health check.
 */
const manifestOf = (directory) =>
  JSON.parse(readFileSync(`${directory}/package.json`, "utf8"));

const byName = new Map(
  readdirSync("packages")
    .map((entry) => `packages/${entry}`)
    .filter((directory) => existsSync(`${directory}/package.json`))
    .map((directory) => [manifestOf(directory).name, directory])
);

const workspaceDependencies = (directory) =>
  Object.keys(manifestOf(directory).dependencies ?? {}).filter((name) =>
    byName.has(name)
  );

const needed = new Set();
const pending = workspaceDependencies("apps/server");

while (pending.length > 0) {
  const name = pending.pop();
  const directory = byName.get(name);
  if (directory === undefined || needed.has(directory)) {
    continue;
  }
  needed.add(directory);
  pending.push(...workspaceDependencies(directory));
}

process.stdout.write([...needed].sort().join("\n"));
