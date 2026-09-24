import type { EvalJournalEntry } from "@anpord/schema/domain/evals";

const said = (at: number, text: string): EvalJournalEntry => ({
  _tag: "message",
  finishedAtMillis: at,
  role: "user",
  text,
  usage: null,
});

const replied = (at: number, text: string): EvalJournalEntry => ({
  _tag: "message",
  finishedAtMillis: at,
  role: "assistant",
  text,
  usage: null,
});

const ran = (
  from: number,
  to: number,
  command: string,
  output: string,
  exitCode = 0
): EvalJournalEntry => ({
  _tag: "command",
  command: `/bin/bash -lc '${command}'`,
  exitCode,
  finishedAtMillis: to,
  output,
  startedAtMillis: from,
});

export const CONVERSATION: readonly EvalJournalEntry[] = [
  said(
    0,
    "can you get a Pro plan live in my autumn sandbox? $20/mo, 500 AI messages a month, hard stop when they run out"
  ),
  replied(
    6000,
    "I’ll inspect the existing Autumn catalog and config, then show you the pricing before anything goes live."
  ),
  ran(
    6400,
    6450,
    'pwd && rg --files -g "!node_modules" -g "!*.lock" | sort && printf "\\n--- package/config references ---\\n" && rg -n "atmn|autumn" .',
    '/tmp/anpord-task\nAGENTS.md\npackage-lock.json\npackage.json\n\n--- package/config references ---\n./package.json:9:    "atmn": "^2.0.0"'
  ),
  ran(7000, 8400, "npx atmn push --help", "error: unknown command", 1),
  ran(9000, 9500, "npx atmn skills autumn-catalog", ""),
  {
    _tag: "toolCall",
    finishedAtMillis: 12_400,
    input: '{"query":"plans"}',
    name: "autumn.listPlans",
    output: "[]",
    startedAtMillis: 11_000,
    status: "completed",
  },
  replied(
    19_000,
    "Here’s the pricing I’d apply:\n\n- **Pro** at `$20/month`\n- 500 AI messages, hard limit\n\nShall I push it live?"
  ),
  said(24_000, "yes"),
  {
    _tag: "fileChange",
    finishedAtMillis: 31_000,
    paths: ["/tmp/anpord-task/autumn.config.ts"],
  },
  ran(33_000, 35_200, "npx atmn push --yes", "pushed pro: $20 / month"),
  replied(
    38_000,
    "Pro is live in your Autumn sandbox.\n\nConfig: [autumn.config.ts](autumn.config.ts)"
  ),
];
