import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

export interface AbOptions {
  readonly after: string;
  readonly before: string;
  readonly directory: string;
  readonly quick: boolean;
  readonly rounds: number;
  readonly suite: string;
}

export interface AbFiles {
  readonly after: readonly string[];
  readonly before: readonly string[];
}

const measure = (
  suite: string,
  target: string,
  out: string,
  quick: boolean
) => {
  const ran = spawnSync(
    "bun",
    [
      "run",
      join(import.meta.dir, "main.ts"),
      suite,
      "--target",
      resolve(target),
      "--out",
      out,
      ...(quick ? ["--quick"] : []),
    ],
    { stdio: "inherit" }
  );
  if (ran.status !== 0) {
    throw new Error(
      `Measuring ${suite} on ${target} failed with exit ${ran.status}, so the comparison would be one sided.`
    );
  }
  return out;
};

export const runAb = (options: AbOptions): AbFiles => {
  const before: string[] = [];
  const after: string[] = [];
  for (let round = 1; round <= options.rounds; round += 1) {
    before.push(
      measure(
        options.suite,
        options.before,
        join(options.directory, `before-${round}.json`),
        options.quick
      )
    );
    after.push(
      measure(
        options.suite,
        options.after,
        join(options.directory, `after-${round}.json`),
        options.quick
      )
    );
  }
  return { after, before };
};
