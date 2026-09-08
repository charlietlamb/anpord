import {
  type EvalValidation,
  validationCapture,
  validationExecution,
} from "@anpord/schema/domain/eval-validations";

const capture = validationCapture();
const answer = [
  "The failing MCP server is **`checkout-api-staging`** (`srv_checkout_staging`).",
  "- **Cause:** `MANUFACT_TOKEN` is missing from the deployment environment. The build exited with code 1.\n- **Fix:** Add `MANUFACT_TOKEN` under **Settings → Environment**, then rebuild/redeploy the server.\n- **Unrelated warning:** The unmet `react@18` peer dependency was only a warning, not the build failure.",
].join("\n\n");
const code: EvalValidation = {
  ...validationExecution(
    { id: "code:0", index: 0, name: "validateDiagnose", kind: "code" },
    1000
  ),
  status: "passed",
  durationMs: 6,
  input: capture({}),
  output: capture({
    passed: true,
    message:
      "Surveyed the account, read the failing server’s logs, and named the cause and the specific remedy needed to restore the deployment.",
  }),
  calls: [
    {
      index: 0,
      method: "answer",
      startedAt: 1000,
      durationMs: 3,
      input: capture([]),
      output: capture(answer),
      error: null,
    },
    {
      index: 1,
      method: "mcp.calls",
      startedAt: 1000,
      durationMs: 2,
      input: capture([]),
      output: capture([
        { name: "manufact.servers_list", status: "completed" },
        { name: "manufact.servers_logs", status: "completed" },
      ]),
      error: null,
    },
  ],
};
const judgment = {
  name: "actionable-diagnosis",
  model: "gpt-5.6-sol",
  evaluator: "codex",
  score: 1,
  choice: "correct",
  threshold: 1,
  durationMs: 14_197,
  error: null,
  reason:
    "The output identifies checkout-api-staging and the missing MANUFACT_TOKEN, then gives the location and next step needed to fix it.",
};
const judge: EvalValidation = {
  ...validationExecution(
    { id: "judge:0", index: 0, name: judgment.name, kind: "judge" },
    1006
  ),
  status: "passed",
  durationMs: judgment.durationMs,
  judgment,
  message: judgment.reason,
  input: capture({
    model: judgment.model,
    instructions:
      "Evaluate the supplied output using the evidence provided. The diagnosis should identify the failing server, explain the supported cause, and give a specific remedy and location.\n\nReturn only JSON matching the response schema. Do not reward an answer that only repeats the error without explaining how to resolve it.",
    input: JSON.stringify({
      input: "Find the failing server and report the cause and remedy.",
      output: answer,
      expected: null,
    }),
  }),
  output: capture(
    JSON.stringify({ choice: judgment.choice, reason: judgment.reason }),
    "text"
  ),
};

export const VALIDATION_TRIALS = [
  { ordinal: 1, validations: [code, judge] },
  {
    ordinal: 2,
    validations: [
      code,
      {
        ...judge,
        status: "failed" as const,
        judgment: {
          ...judgment,
          score: 0,
          choice: "incorrect",
          reason:
            "The diagnosis identifies the server but does not explain how to fix it.",
        },
        input: capture({
          model: judgment.model,
          instructions: "Check that the diagnosis gives a specific remedy.",
          input: JSON.stringify({
            input: "Find the failing server and report the cause and remedy.",
            output: "checkout-api-staging is failing.",
            expected: null,
          }),
        }),
        output: capture(
          JSON.stringify({
            choice: "incorrect",
            reason: "The diagnosis does not explain how to fix it.",
          }),
          "text"
        ),
      },
    ],
  },
  { ordinal: 3 },
];
