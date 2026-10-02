import type { EvalValidation } from "@sphynx/schema/domain/eval-validations";
import { validationExecution } from "@sphynx/schema/domain/eval-validations";
import type { HarnessEvent } from "@sphynx/schema/domain/harness-event";
import type { LocalTrialResult } from "../../src/cli/local-trial-result";

const STARTED_AT = 1_790_000_000_000;
const DURATION_MS = 403_000;

const filled = (line: string, length: number) =>
  line.repeat(Math.ceil(length / line.length)).slice(0, length);

const LOUD_COMMANDS: readonly (readonly [string, string, number])[] = [
  ["bun install", "+ @useautumn/sdk@0.9.4 (resolved 12ms)\n", 180_000],
  [
    'rg -n "autumn" .',
    "node_modules/autumn-js/dist/index.mjs:1204:  const customer = await autumn.customers.get(id);\n",
    1_400_000,
  ],
  [
    "cat bun.lock",
    '    "@useautumn/sdk": ["@useautumn/sdk@0.9.4", "", {}],\n',
    620_000,
  ],
  [
    "bunx tsc --noEmit",
    "src/licenses/invite.ts(41,7): error TS2322: Type 'string' is not assignable to type 'number'.\n",
    380_000,
  ],
  [
    "bun test",
    "(pass) licenses > invites a batch of seats [3.21ms]\n",
    950_000,
  ],
  [
    "git diff",
    '+  await autumn.track({ customerId, featureId: "seats" });\n',
    240_000,
  ],
  ["bun run build", "  dist/licenses/invite.js  12.4 KB\n", 310_000],
];

const STEPS = 136;
const LOUD_EVERY = 20;
const CHECKS = 6;

const at = (step: number) =>
  STARTED_AT + Math.round((step / STEPS) * DURATION_MS);

const journal = (() => {
  const middle = Array.from({ length: STEPS }, (_, step): HarnessEvent => {
    const loud =
      step % LOUD_EVERY === 0 ? LOUD_COMMANDS[step / LOUD_EVERY] : undefined;
    if (loud !== undefined) {
      const [command, line, length] = loud;
      return {
        _tag: "Command",
        at: at(step),
        command,
        exitCode: 0,
        output: filled(line, length),
      };
    }
    if (step % 3 === 0) {
      return {
        _tag: "ToolCall",
        at: at(step),
        callId: `call_${step}`,
        input: filled(
          '*** Update File: src/licenses/invite.ts\n+  const seats = await autumn.check({ featureId: "seats" });\n',
          3000 + (step % 5) * 1000
        ),
        name: "apply_patch",
        status: "completed",
      };
    }
    if (step % 3 === 1) {
      return {
        _tag: "Message",
        at: at(step),
        role: "assistant",
        text: filled(
          "I will wire the invite batch through Autumn's seat balance before sending emails. ",
          520
        ),
        usage: {
          cacheReadTokens: 1800,
          cacheWriteTokens: 0,
          inputTokens: 500,
          outputTokens: 250,
          totalTokens: 2550,
        },
      };
    }
    return {
      _tag: "Command",
      at: at(step),
      command: `sed -n '1,120p' src/licenses/file-${step}.ts`,
      exitCode: 0,
      output: filled(
        "export const invite = async (seats: number) => {\n",
        4200
      ),
    };
  });

  return [
    { _tag: "Started", at: STARTED_AT, model: "gpt-5.6-luna", sessionId: "s1" },
    ...middle,
    {
      _tag: "Finished",
      at: STARTED_AT + DURATION_MS,
      reason: "turn.completed",
    },
  ] satisfies readonly HarnessEvent[];
})();

const commands = journal.filter((event) => event._tag === "Command").length;

const check = (index: number): EvalValidation => ({
  ...validationExecution(
    { id: `check-${index}`, index, kind: "code", name: `Check ${index}` },
    STARTED_AT + DURATION_MS
  ),
  durationMs: 900,
  output: {
    format: "text",
    state: "captured",
    text: filled("expected seats to be tracked in Autumn\n", 16_000),
    truncated: true,
  },
  status: index < 4 ? "passed" : "failed",
});

export const longTrial: LocalTrialResult = {
  commands,
  durationMs: DURATION_MS,
  events: journal,
  kind: "scored",
  outcome: {
    artifacts: [],
    commandCount: commands,
    exitCode: 0,
    modelMs: 380_000,
    sandboxMs: 23_000,
    status: "failed",
    validations: Array.from({ length: CHECKS }, (_, index) => check(index)),
    verifySteps: [],
    voidFields: [],
  },
  sandboxId: "local",
  usage: {
    cacheReadTokens: 81_000,
    cacheWriteTokens: 0,
    inputTokens: 22_500,
    outputTokens: 11_250,
    totalTokens: 114_750,
  },
  userSpend: null,
};
