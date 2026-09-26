import type { EvalJournalEntry } from "@anpord/schema/domain/evals";

const START = Date.UTC(2026, 8, 26, 12, 25, 43);
const at = (seconds: number) => START + seconds * 1000;
const WORKSPACE = "/private/var/folders/f2/T/anpord-workspace-nZuB7b";
const SKILLS = `${WORKSPACE}/.codex/skills`;

const say = (seconds: number, text: string): EvalJournalEntry => ({
  _tag: "message",
  finishedAtMillis: at(seconds),
  role: "assistant",
  text,
});

const ask = (seconds: number, text: string): EvalJournalEntry => ({
  _tag: "message",
  finishedAtMillis: at(seconds),
  role: "user",
  text,
});

const run = (
  seconds: number,
  script: string,
  tookMs: number,
  exitCode = 0
): EvalJournalEntry => ({
  _tag: "command",
  command: `/bin/zsh -lc "${script}"`,
  exitCode,
  finishedAtMillis: at(seconds) + tookMs,
  output: exitCode === 0 ? "ok" : "Error: AUTUMN_SECRET_KEY is not set",
  startedAtMillis: at(seconds),
});

export const AUTUMN_TRAJECTORY: readonly EvalJournalEntry[] = [
  ask(
    0,
    "hey, simple setup: one pro plan, $30 a month, comes with 1,000 credits a month. chat messages use credits, 1 each."
  ),
  say(
    24,
    "I’m using the Autumn setup workflow to model the Pro plan, create the config, and push it to your empty sandbox org."
  ),
  run(30, `sed -n '1,240p' ${SKILLS}/autumn-setup/SKILL.md`, 4),
  run(46, `sed -n '1,280p' ${SKILLS}/autumn-catalog/SKILL.md`, 2),
  run(
    63,
    `sed -n '1,260p' ${SKILLS}/autumn-concepts/SKILL.md && sed -n '1,220p' ${SKILLS}/autumn-catalog/references/atmn.md && sed -n '1,180p' ${SKILLS}/autumn-catalog/references/recurring.md`,
    10
  ),
  say(
    85,
    "Setup status: got your pricing. I’m initializing the local Autumn config now, then I’ll show the exact catalog for approval before pushing it."
  ),
  run(88, "npx atmn init", 2200),
  run(
    104,
    "rg --files -g 'autumn.config.ts' -g 'features.ts' -g 'plans.ts' | sort && sed -n '1,240p' autumn.config.ts",
    3
  ),
  say(
    125,
    "Autumn is connected and ready. Before I write and push the catalog, please confirm: Pro at $30/month with 1,000 credits, and 1 chat message = 1 credit. Should I proceed?"
  ),
  ask(
    138,
    "Credits carry over, capped at 1,000, and expire after one month. There’s a hard stop at zero with no overage or top-ups. Please write the config file, but don’t push it."
  ),
  say(
    166,
    "I’ll update the draft with monthly credit carry-over capped at 1,000 and one-month expiry, then validate the config locally. I will not push it."
  ),
  run(
    172,
    `sed -n '1,220p' ${SKILLS}/autumn-concepts/references/feature.md && sed -n '1,260p' ${SKILLS}/autumn-concepts/references/plan-items.md`,
    2
  ),
  run(
    185,
    `rg -n 'rollover|expiryDuration' ${SKILLS}/autumn-catalog/references`,
    2
  ),
  run(
    195,
    `sed -n '1,90p' ${SKILLS}/autumn-catalog/references/rollovers.md`,
    3
  ),
  {
    _tag: "fileChange",
    finishedAtMillis: at(220),
    paths: [`${WORKSPACE}/autumn.config.ts`],
  },
  run(228, "npx atmn push", 896),
  say(
    247,
    "Configured and validated **autumn.config.ts**. Pro is $30/month with 1,000 credits monthly, carry-over capped at 1,000, and a hard stop at zero. The dry run passed, and nothing was pushed."
  ),
];

export const FAILED_TRAJECTORY: readonly EvalJournalEntry[] = [
  ...AUTUMN_TRAJECTORY.slice(0, 7),
  run(96, "npx atmn push", 1400, 1),
  say(
    112,
    "The push failed because the sandbox key is missing. I’ll stop here so you can add it."
  ),
];

export const RUNNING_TRAJECTORY: readonly EvalJournalEntry[] = [
  ...AUTUMN_TRAJECTORY.slice(0, 6),
  {
    _tag: "command",
    command: '/bin/zsh -lc "npx atmn init"',
    exitCode: null,
    finishedAtMillis: null,
    output: "",
    startedAtMillis: at(88),
  },
];

export const UNTIMED_TRAJECTORY: readonly EvalJournalEntry[] =
  AUTUMN_TRAJECTORY.slice(0, 8).map((entry) =>
    entry._tag === "command"
      ? { ...entry, finishedAtMillis: null, startedAtMillis: null }
      : { ...entry, finishedAtMillis: null }
  );

export const WORST_CASE_TRAJECTORY: readonly EvalJournalEntry[] = [
  ask(
    0,
    "Set up a usage based plan with seats, a free tier that includes five hundred messages, an annual discount of twenty percent, and a top up pack of ten thousand credits that never expires."
  ),
  ...Array.from({ length: 9 }, (_, turn): readonly EvalJournalEntry[] => [
    say(
      10 + turn * 40,
      `Step ${turn + 1}: reading the catalog references for seats, free tiers, annual billing intervals, and top up packs before changing anything in the configuration.`
    ),
    run(
      14 + turn * 40,
      `sed -n '1,400p' ${SKILLS}/autumn-catalog/references/a-very-long-reference-file-name-for-seat-based-billing-${turn}.md`,
      12
    ),
    run(
      20 + turn * 40,
      "npx atmn push --dry-run --config ./configs/production/autumn.config.ts",
      1800 + turn * 90,
      turn === 4 ? 1 : 0
    ),
  ]).flat(),
];
