import type { StartEvalRequest } from "@anpord/schema/domain/evals";
import { Button } from "@anpord/ui/components/button";
import { Label } from "@anpord/ui/components/ui/label";
import { Textarea } from "@anpord/ui/components/ui/textarea";
import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { z } from "zod";

/** The task the playground opens with: a deliberate off-by-one an agent can
 * find by reading the failure. The point is not difficulty, it is that a
 * verifier which cannot tell the broken version from the fixed one is broken
 * itself. */
const DEFAULT_SOURCE =
  "export const total = (items) => items.reduce((sum, item) => sum + item, 0) - 1;\n";

const DEFAULT_TEST = [
  'import assert from "node:assert/strict";',
  'import { test } from "node:test";',
  'import { total } from "./total.mjs";',
  "",
  'test("total sums its items", () => {',
  "  assert.equal(total([1, 2, 3]), 6);",
  "});",
  "",
].join("\n");

const schema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1),
  provider: z.enum(["daytona", "e2b"]),
  source: z.string().min(1),
  test: z.string().min(1),
  trials: z.string(),
  verifyCommand: z.string().min(1),
});

export function PlaygroundForm({
  onStart,
  pending,
}: {
  readonly onStart: (request: StartEvalRequest) => void;
  readonly pending: boolean;
}) {
  const form = useAppForm({
    defaultValues: {
      model: "gpt-5.2",
      prompt:
        "the test fails, fix total.mjs so it passes. do not edit the test.",
      provider: "daytona" as "daytona" | "e2b",
      source: DEFAULT_SOURCE,
      test: DEFAULT_TEST,
      trials: "3",
      verifyCommand: "node --test 2>&1",
    },
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      onStart({
        harness: "codex",
        model: value.model,
        provider: value.provider,
        task: {
          files: { "total.mjs": value.source, "total.test.mjs": value.test },
          name: "fix-total",
          prompt: value.prompt,
          setupCommand: null,
          verifyCommand: value.verifyCommand,
        },
        trials: Number(value.trials),
      });
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.AppField name="prompt">
        {(field) => <field.TextField label="Prompt" />}
      </form.AppField>

      <div className="grid gap-4 sm:grid-cols-3">
        <form.AppField name="provider">
          {(field) => (
            <field.SelectField
              label="Sandbox"
              options={[
                { label: "Daytona", value: "daytona" },
                { label: "E2B", value: "e2b" },
              ]}
            />
          )}
        </form.AppField>

        <form.AppField name="model">
          {(field) => <field.TextField label="Model" />}
        </form.AppField>

        <form.AppField name="trials">
          {(field) => (
            <field.SelectField
              label="Trials"
              options={[
                { label: "1 trial", value: "1" },
                { label: "3 trials", value: "3" },
                { label: "5 trials", value: "5" },
              ]}
            />
          )}
        </form.AppField>
      </div>

      <form.AppField name="source">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor="source">total.mjs</Label>
            <Textarea
              className="font-mono text-xs"
              id="source"
              onChange={(event) => field.handleChange(event.target.value)}
              rows={4}
              value={field.state.value}
            />
          </div>
        )}
      </form.AppField>

      <form.AppField name="test">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor="test">total.test.mjs</Label>
            <Textarea
              className="font-mono text-xs"
              id="test"
              onChange={(event) => field.handleChange(event.target.value)}
              rows={8}
              value={field.state.value}
            />
          </div>
        )}
      </form.AppField>

      <form.AppField name="verifyCommand">
        {(field) => <field.TextField label="Verify command" />}
      </form.AppField>

      <Button disabled={pending} type="submit">
        {pending ? "Running..." : "Run eval"}
      </Button>
    </form>
  );
}
