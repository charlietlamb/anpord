import type { EvalDraft } from "@anpord/schema/domain/evals";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { SearchableMultiSelect } from "@anpord/ui/components/ui/searchable-multi-select";
import { FlaskIcon, PlayIcon } from "@phosphor-icons/react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { AgentField } from "@/components/evals/agent-field";
import { BlockedNote } from "@/components/evals/blocked-note";
import { AddCaseButton, CaseRow } from "@/components/evals/case-editor";
import { CredentialField } from "@/components/evals/credential-field";
import { RunPreview } from "@/components/evals/run-preview";
import { WorkspaceField } from "@/components/evals/workspace-field";
import { credentialQueries } from "@/lib/credential-queries";
import {
  missingCredentialIntegrations,
  normalizeCredentialSelections,
  requiredCredentialIntegrations,
} from "@/lib/evals/credential-selection";
import { evalQueries } from "@/lib/evals/eval-queries";
import {
  emptyCase,
  ungatedIn,
  useCaseKeys,
  useEvalForm,
} from "@/lib/evals/use-eval-form";
import { DEFAULT_HARNESS, PROVIDER_OPTIONS } from "@/lib/evals/variant-options";
import { providerPresentation } from "@/lib/evals/variant-presentation";

export function EvalForm({
  initial,
  onSubmit,
  submitLabel = "Run eval",
  submitting,
}: {
  readonly initial?: EvalDraft;
  readonly onSubmit: (draft: EvalDraft) => Promise<void>;
  readonly submitLabel?: string;
  readonly submitting: boolean;
}) {
  const catalogue = useSuspenseQuery(evalQueries.models(DEFAULT_HARNESS));
  const connections = useQuery(credentialQueries.connections());
  const form = useEvalForm({
    defaultModel: catalogue.data.models.at(0)?.id ?? null,
    initial,
    onSubmit: (draft) =>
      onSubmit({
        ...draft,
        connections: normalizeCredentialSelections(
          requiredCredentialIntegrations(draft.agents, draft.providers),
          connections.data ?? [],
          draft.connections
        ),
      }),
  });
  const keys = useCaseKeys(form.state.values.cases.length);

  return (
    <form
      className="flex flex-col gap-8 pb-8"
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

                          {/* Workspace and setup sit between the goal and the
                              verifier because that is the order the run takes:
                              the code arrives, it is prepared, the agent works,
                              and the verifier decides. */}
                          <form.Field name={`cases[${index}].source`}>
                            {(field) => (
                              <WorkspaceField
                                onChange={field.handleChange}
                                value={field.state.value}
                              />
                            )}
                          </form.Field>

                          <form.AppField name={`cases[${index}].setup`}>
                            {(field) => (
                              <field.ShellField
                                description="Runs before the agent starts, for installing dependencies or building. Its output is not scored."
                                label="Setup"
                                placeholder="bun install"
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
                onAdd={() => {
                  keys.add();
                  form.pushFieldValue("cases", emptyCase());
                }}
              />
            </div>
          )}
        </form.Subscribe>
      </section>

      <section className="flex flex-col gap-3">
        <PageHeading icon={PlayIcon} title="Variants" />

        <div className="grid gap-3 sm:grid-cols-3 [&>*]:min-w-0">
          <form.Field name="agents">
            {(field) => (
              <AgentField
                onChange={(next) => field.handleChange(next)}
                value={field.state.value}
              />
            )}
          </form.Field>

          <form.Field name="providers">
            {(providers) => (
              <div className="grid gap-1.5">
                <span className="font-medium text-xs">Sandboxes</span>
                <SearchableMultiSelect
                  emptyLabel="Choose a sandbox"
                  label="Sandboxes"
                  onChange={(next) => providers.handleChange(next)}
                  options={PROVIDER_OPTIONS}
                  renderOption={(option) => {
                    const { Icon } = providerPresentation(option.value);

                    return (
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    );
                  }}
                  searchPlaceholder="Search sandboxes…"
                  value={providers.state.value}
                />
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe
          selector={(state) => ({
            agents: state.values.agents,
            providers: state.values.providers,
          })}
        >
          {({ agents, providers }) => (
            <form.Field name="connections">
              {(field) => (
                <CredentialField
                  connections={connections.data ?? []}
                  integrationIds={requiredCredentialIntegrations(
                    agents,
                    providers
                  )}
                  loading={connections.isPending}
                  onChange={field.handleChange}
                  value={field.state.value}
                />
              )}
            </form.Field>
          )}
        </form.Subscribe>
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
        {(values) => {
          const integrationIds = requiredCredentialIntegrations(
            values.agents,
            values.providers
          );
          const selected = normalizeCredentialSelections(
            integrationIds,
            connections.data ?? [],
            values.connections
          );
          const missing = missingCredentialIntegrations(
            integrationIds,
            connections.data ?? [],
            selected
          );

          return (
            <div className="flex flex-col gap-4 border-border-faint border-t pt-5">
              <RunPreview
                agents={values.agents}
                cases={values.cases}
                providers={values.providers}
                trials={values.trials}
                ungated={ungatedIn(values.cases)}
              />

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <form.AppForm>
                  <form.SubmitButton
                    disabled={connections.isError || missing.length > 0}
                    fullWidth={false}
                    label={submitting ? "Starting…" : submitLabel}
                  />
                </form.AppForm>

                {/* Said beside the control rather than on hover: a disabled
                    button with no reason is a dead end, and the reader who
                    needs this is the one who has not thought to hover it. */}
                <BlockedNote failed={connections.isError} missing={missing} />
              </div>
            </div>
          );
        }}
      </form.Subscribe>
    </form>
  );
}
