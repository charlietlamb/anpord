import type { EvalDraft } from "@anpord/schema/domain/evals";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { FlaskIcon, PlayIcon } from "@phosphor-icons/react";
import { AddCaseButton, CaseRow } from "@/components/evals/case-editor";
import { RunPreview } from "@/components/evals/run-preview";
import { VariantPicker } from "@/components/evals/variant-picker";
import {
  emptyCase,
  ungatedIn,
  useCaseKeys,
  useEvalForm,
} from "@/lib/evals/use-eval-form";
import { MODEL_OPTIONS, PROVIDER_OPTIONS } from "@/lib/evals/variant-options";
import {
  modelPresentation,
  providerPresentation,
} from "@/lib/evals/variant-presentation";

/**
 * A new eval, on one page.
 *
 * Ordered by what a person actually decides: the cases are the eval, the
 * variants are what it is run against, and the trial count is how many times.
 * The name comes last and defaults to nothing, because a run is recognised by
 * what it tested and naming it first is ceremony before substance.
 *
 * One page rather than a wizard. A reader running many evals needs the whole
 * configuration visible at once to reason about coverage and cost, and a
 * wizard hides exactly the thing that multiplies.
 */
export function EvalForm({
  onSubmit,
  submitting,
}: {
  readonly onSubmit: (draft: EvalDraft) => Promise<void>;
  readonly submitting: boolean;
}) {
  const form = useEvalForm({ onSubmit });
  const keys = useCaseKeys(form.state.values.cases.length);

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <section className="flex flex-col gap-2">
        <PageHeading icon={FlaskIcon} title="Cases" />

        <form.Subscribe selector={(state) => state.values.cases.length}>
          {(caseCount) => (
            <div className="flex flex-col gap-2">
              <ul className="flex flex-col gap-2">
                {Array.from({ length: caseCount }, (_, index) => index).map(
                  (index) => (
                    <form.Subscribe
                      key={keys.at(index)}
                      selector={(state) => state.values.cases[index]}
                    >
                      {(subject) => (
                        <CaseRow
                          defaultOpen={index === 0}
                          name={subject?.name ?? ""}
                          onRemove={() => {
                            keys.forget(index);
                            form.removeFieldValue("cases", index);
                          }}
                          removable={caseCount > 1}
                          ungated={
                            subject?.verify === null ||
                            (subject?.verify ?? "").trim() === ""
                          }
                        >
                          <form.AppField name={`cases[${index}].name`}>
                            {(field) => (
                              <field.TextField
                                label="Name"
                                placeholder="github-logo-in-footer"
                              />
                            )}
                          </form.AppField>

                          <form.AppField name={`cases[${index}].goal`}>
                            {(field) => (
                              <field.TextareaField
                                description="What the agent is asked to do, in the words a person would use."
                                label="Goal"
                                placeholder="I'm building a Next.js marketing site and I want to show the GitHub logo in the footer…"
                                rows={4}
                              />
                            )}
                          </form.AppField>

                          <form.AppField name={`cases[${index}].verify`}>
                            {(field) => (
                              <field.ShellField
                                description="Shell that decides a pass. Exit zero is a pass; anything else is the check saying no."
                                label="Verify"
                                placeholder={
                                  "test -f public/logos/github-light.svg\ngrep -q '<svg' public/logos/github-light.svg"
                                }
                              />
                            )}
                          </form.AppField>
                        </CaseRow>
                      )}
                    </form.Subscribe>
                  )
                )}
              </ul>

              <AddCaseButton
                onAdd={() => form.pushFieldValue("cases", emptyCase())}
              />
            </div>
          )}
        </form.Subscribe>
      </section>

      <section className="flex flex-col gap-3">
        <PageHeading icon={PlayIcon} title="Variants" />

        <div className="grid gap-3 sm:grid-cols-2">
          <form.Field name="models">
            {(models) => (
              <div className="grid gap-1.5">
                <span className="font-medium text-xs">Models</span>
                <VariantPicker
                  emptyLabel="Choose a model"
                  iconOf={(value) => modelPresentation(value).Icon}
                  label="Models"
                  onChange={(next) => models.handleChange(next)}
                  options={MODEL_OPTIONS}
                  value={models.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="providers">
            {(providers) => (
              <div className="grid gap-1.5">
                <span className="font-medium text-xs">Sandboxes</span>
                <VariantPicker
                  emptyLabel="Choose a sandbox"
                  iconOf={(value) => providerPresentation(value).Icon}
                  label="Sandboxes"
                  onChange={(next) => providers.handleChange(next)}
                  options={PROVIDER_OPTIONS}
                  value={providers.state.value}
                />
              </div>
            )}
          </form.Field>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <form.AppField name="trials">
          {(field) => (
            <field.NumberField
              description="Same case, same variant, run again. More trials is how a flaky agent stops reading as a passing one."
              label="Trials"
              max={10}
              min={1}
            />
          )}
        </form.AppField>
      </section>

      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <div className="flex flex-col gap-4 border-border-faint border-t pt-5">
            <RunPreview
              cases={values.cases}
              models={values.models}
              providers={values.providers}
              trials={values.trials}
              ungated={ungatedIn(values.cases)}
            />

            <form.AppForm>
              <form.SubmitButton
                fullWidth={false}
                label={submitting ? "Starting…" : "Run eval"}
              />
            </form.AppForm>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
