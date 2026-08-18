import type { Outcome } from "./run";

/** Names every failure again at the end, so a long run does not need scrolling
 * back through the passes to find what broke. */
export const summarise = (outcomes: readonly Outcome[]) => {
  const failed = outcomes.filter((outcome) => !outcome.passed);

  process.stdout.write(
    `\n${outcomes.length - failed.length}/${outcomes.length} scenarios passed\n`
  );

  for (const outcome of failed) {
    process.stdout.write(`  failed: ${outcome.name}\n`);
  }

  return failed.length === 0;
};
