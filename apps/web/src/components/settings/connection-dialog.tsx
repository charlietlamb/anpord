import type { CredentialIntegration } from "@anpord/schema/domain/credentials";
import { FormDialog } from "@anpord/ui/components/dialog/form-dialog";
import { LabelledSelect } from "@anpord/ui/components/form/labelled-select";
import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { VariantLabel } from "@/components/evals/variant-label";
import { CredentialFields } from "@/components/settings/credential-fields";
import { DeviceChallenge } from "@/components/settings/device-challenge";
import { credentialsClient } from "@/lib/credentials-client";
import { incompleteCredential } from "@/lib/settings/credential-values";
import { integrationPresentation } from "@/lib/settings/integration-presentation";
import { useCredentialMutation } from "@/lib/settings/use-credential-mutation";
import { useDeviceLogin } from "@/lib/settings/use-device-login";

const CREDENTIAL_ONLY = new Set(["command", "env"]);

const SCOPE_OPTIONS = [
  { label: "Everyone in the organization", value: "organization" },
  { label: "Only me", value: "personal" },
];

const COPY = {
  harness: {
    description:
      "The account the agent runs on. Secret values are encrypted and never shown again.",
    field: "Harness",
    title: "Add harness",
  },
  model: {
    description:
      "The provider that scores a case or plays its human. Secret values are encrypted and never shown again.",
    field: "Provider",
    title: "Add provider",
  },
  sandbox: {
    description:
      "Run sandboxes on your own account instead of Anpord's. Secret values are encrypted and never shown again.",
    field: "Sandbox",
    title: "Add sandbox",
  },
} as const;

const submitLabel = (device: boolean, pending: boolean, waiting: boolean) => {
  if (waiting) {
    return "Waiting for ChatGPT…";
  }
  if (pending) {
    return device ? "Starting…" : "Adding…";
  }
  return device ? "Connect ChatGPT" : "Add connection";
};

interface ConnectionValues {
  readonly integrationId: string;
  readonly methodId: string;
  readonly name: string;
  readonly values: Readonly<Record<string, string>>;
}

const scopeOf = (scope: string) =>
  scope === "personal" ? "personal" : "organization";

export function ConnectionDialog({
  category,
  integrations: all,
  onClose,
  open,
}: {
  readonly category: CredentialIntegration["category"];
  readonly integrations: readonly CredentialIntegration[];
  readonly onClose: () => void;
  readonly open: boolean;
}) {
  const copy = COPY[category];
  const integrations = all.filter(
    (item) => item.category === category && !CREDENTIAL_ONLY.has(item.id)
  );
  const methodsOf = (id: string) =>
    integrations.find((item) => item.id === id)?.authMethods ?? [];
  const methodOf = (value: ConnectionValues) =>
    methodsOf(value.integrationId).find((item) => item.id === value.methodId);
  const incomplete = (value: ConnectionValues) => {
    const method = methodOf(value);

    return (
      value.name.trim() === "" ||
      method === undefined ||
      incompleteCredential(method, value.values)
    );
  };

  const create = useCredentialMutation({
    mutationFn: credentialsClient.create,
    success: "Connection added",
  });

  const form = useAppForm({
    defaultValues: {
      integrationId: integrations[0]?.id ?? "",
      methodId: integrations[0]?.authMethods[0]?.id ?? "",
      name: "",
      scope: "organization",
      values: {} as Readonly<Record<string, string>>,
    },
    onSubmit: ({ value }) => {
      if (incomplete(value) || device.challenge !== null) {
        return;
      }

      const name = value.name.trim();

      if (methodOf(value)?.kind === "device") {
        device.start({
          integrationId: "codex",
          name,
          scope: scopeOf(value.scope),
        });
        return;
      }

      create.mutate(
        {
          authMethodId: value.methodId,
          integrationId: value.integrationId,
          isDefault: false,
          name,
          scope: scopeOf(value.scope),
          values: value.values,
        },
        { onSuccess: close }
      );
    },
  });

  const close = () => {
    form.reset();
    device.reset();
    onClose();
  };

  const device = useDeviceLogin(close);

  const restart = () => {
    form.setFieldValue("values", {});
    device.reset();
  };

  return (
    <FormDialog
      description={copy.description}
      onClose={close}
      onSubmit={form.handleSubmit}
      open={open}
      title={copy.title}
    >
      <form.Subscribe selector={(state) => state.values}>
        {(values) => {
          const methods = methodsOf(values.integrationId);
          const method = methodOf(values);
          const isDevice = method?.kind === "device";
          const waiting = device.challenge !== null;
          const pending = create.isPending || device.starting;

          return (
            <>
              <form.AppField
                listeners={{
                  onChange: ({ value }) => {
                    form.setFieldValue(
                      "methodId",
                      methodsOf(value)[0]?.id ?? ""
                    );
                    restart();
                  },
                }}
                name="integrationId"
              >
                {(field) => (
                  <LabelledSelect
                    id="connection-integration"
                    label={copy.field}
                    onChange={field.handleChange}
                    options={integrations.map((item) => {
                      const own = integrationPresentation(item);

                      return {
                        label: (
                          <VariantLabel Icon={own.Icon}>
                            {own.label}
                          </VariantLabel>
                        ),
                        value: item.id,
                      };
                    })}
                    triggerClassName="w-full"
                    value={field.state.value}
                  />
                )}
              </form.AppField>

              {methods.length > 1 ? (
                <form.AppField
                  listeners={{ onChange: restart }}
                  name="methodId"
                >
                  {(field) => (
                    <LabelledSelect
                      id="connection-method"
                      label="Sign in with"
                      onChange={field.handleChange}
                      options={methods.map((item) => ({
                        label: item.label,
                        value: item.id,
                      }))}
                      triggerClassName="w-full"
                      value={field.state.value}
                    />
                  )}
                </form.AppField>
              ) : null}

              <form.AppField name="name">
                {(field) => (
                  <field.TextField
                    label="Name"
                    placeholder="Team key, personal key…"
                  />
                )}
              </form.AppField>

              {method === undefined || isDevice ? null : (
                <form.AppField name="values">
                  {(field) => (
                    <CredentialFields
                      method={method}
                      onChange={field.handleChange}
                      values={field.state.value}
                    />
                  )}
                </form.AppField>
              )}

              <form.AppField name="scope">
                {(field) => (
                  <LabelledSelect
                    id="connection-scope"
                    label="Available to"
                    onChange={field.handleChange}
                    options={SCOPE_OPTIONS}
                    triggerClassName="w-full"
                    value={field.state.value}
                  />
                )}
              </form.AppField>

              {device.challenge === null ? null : (
                <DeviceChallenge challenge={device.challenge} />
              )}

              <form.AppForm>
                <form.SubmitButton
                  disabled={pending || waiting || incomplete(values)}
                  label={submitLabel(isDevice, pending, waiting)}
                />
              </form.AppForm>
            </>
          );
        }}
      </form.Subscribe>
    </FormDialog>
  );
}
