import type { StartEvalRequest } from "@anpord/schema/domain/evals";
import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { PlayIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { z } from "zod";

/** The task the playground opens with: a deliberate off-by-one an agent can
 * find by reading the failure. The point is not difficulty. It is that a
 * verifier which cannot tell the broken version from the fixed one is broken
 * itself, and this one can. */
const DEFAULT_SOURCE =
  "export const total = (items) =>\n  items.reduce((sum, item) => sum + item, 0) - 1;\n";

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
  model: z.string().min(1, "A model is required"),
  prompt: z.string().min(1, "The agent needs something to do"),
  provider: z.enum(["daytona", "e2b"]),
  source: z.string().min(1, "There is nothing for the agent to fix"),
  test: z.string().min(1, "Without a test there is nothing to score"),
  trials: z.string(),
  verifyCommand: z.string().min(1, "A verifier is what decides pass or fail"),
});

const PROVIDERS = [
  { label: "Daytona", value: "daytona" },
  { label: "E2B", value: "e2b" },
];

/** More than one, because a single agent run is not repeatable and reporting
 * one as though it were is the mistake this product exists to correct. */
const TRIAL_COUNTS = [
  { label: "1 run", value: "1" },
  { label: "3 runs", value: "3" },
  { label: "5 runs", value: "5" },
];

const Section = ({
  children,
  description,
  title,
}: {
  readonly children: ReactNode;
  readonly description: string;
  readonly title: string;
}) => (
  <section className="space-y-4 border-b px-5 py-5 last:border-b-0">
    <div>
      <h2 className="font-medium text-sm">{title}</h2>
      <p className="mt-0.5 text-muted-foreground text-xs">{description}</p>
    </div>
    {children}
  </section>
);

export function PlaygroundForm({
  onStart,
  running,
}: {
  readonly onStart: (request: StartEvalRequest) => Promise<unknown>;
  readonly running: boolean;
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
    onSubmit: ({ value }) =>
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
      }),
  });

  return (
    <form
      className="overflow-hidden rounded-lg border"
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <Section
        description="What the agent is asked to do, and how many times."
        title="Task"
      >
        <form.AppField name="prompt">
          {(field) => <field.TextField label="Prompt" />}
        </form.AppField>

        <div className="grid gap-4 sm:grid-cols-3">
          <form.AppField name="provider">
            {(field) => (
              <field.SelectField label="Sandbox" options={PROVIDERS} />
            )}
          </form.AppField>

          <form.AppField name="model">
            {(field) => <field.TextField label="Model" />}
          </form.AppField>

          <form.AppField name="trials">
            {(field) => (
              <field.SelectField label="Runs" options={TRIAL_COUNTS} />
            )}
          </form.AppField>
        </div>
      </Section>

      <Section
        description="The agent sees these and may edit the source. The test is the ground truth."
        title="Files"
      >
        <form.AppField name="source">
          {(field) => (
            <field.CodeField
              hint="the agent edits this"
              label="total.mjs"
              rows={4}
            />
          )}
        </form.AppField>

        <form.AppField name="test">
          {(field) => (
            <field.CodeField
              hint="the agent is told not to"
              label="total.test.mjs"
              rows={8}
            />
          )}
        </form.AppField>
      </Section>

      <Section
        description="Run after the agent stops. Its exit code is the verdict, so a pipeline that swallows one is refused."
        title="Verifier"
      >
        <form.AppField name="verifyCommand">
          {(field) => <field.TextField label="Command" />}
        </form.AppField>
      </Section>

      <div className="px-5 py-4">
        <form.AppForm>
          <form.SubmitButton
            icon={<PlayIcon weight="fill" />}
            label={running ? "Running" : "Run eval"}
            loadingLabel="Starting"
          />
        </form.AppForm>
      </div>
    </form>
  );
}
