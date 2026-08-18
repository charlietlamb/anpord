import { join } from "node:path";
import type { World } from "../world";
import { type ProcessResult, runProcess } from "./process";

const VERSION_IN_NOTE = /v(\d+)/;

/**
 * The CLI entrypoint through bun rather than a built binary, so a run needs no
 * publish step and still exercises the same command definitions.
 */
export const cli = (world: World, args: readonly string[], stdin?: string) =>
  runProcess(
    "bun",
    [
      "run",
      join(world.repositoryRoot, "packages/sdk/src/cli/main.ts"),
      ...args,
    ],
    {
      cwd: world.directory,
      env: {
        ...process.env,
        ANPORD_API_KEY: world.writeKey.key,
        ANPORD_BASE_URL: world.baseUrl,
      },
      stdin,
    }
  );

/** Push reports the version it wrote, so a scenario can read that exact
 * version back rather than assuming how many ran before it. */
export const pushedVersion = (result: ProcessResult) => {
  const found = result.stderr.match(VERSION_IN_NOTE);
  if (!found?.[1]) {
    throw new Error(`Could not read a version from ${result.stderr}`);
  }
  return found[1];
};
