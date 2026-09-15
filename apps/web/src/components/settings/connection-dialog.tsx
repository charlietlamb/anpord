import type {
  CredentialIntegration,
  DeviceAuthChallenge,
} from "@anpord/schema/domain/credentials";
import { FormDialog } from "@anpord/ui/components/dialog/form-dialog";
import { LabelledField } from "@anpord/ui/components/form/labelled-field";
import { LabelledSelect } from "@anpord/ui/components/form/labelled-select";
import { Input } from "@anpord/ui/components/input";
import { ShortcutButton } from "@anpord/ui/components/ui/shortcut-button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { VariantLabel } from "@/components/evals/variant-label";
import { CredentialFields } from "@/components/settings/credential-fields";
import { DeviceChallenge } from "@/components/settings/device-challenge";
import { credentialsClient } from "@/lib/credentials-client";
import { incompleteCredential } from "@/lib/settings/credential-values";
import { integrationPresentation } from "@/lib/settings/integration-presentation";

const POLL_MS = 2000;

/* Neither is an account to sign in to: env hands a run the variables the
   customer names, and command runs the customer's own process. They are
   chosen on the run, not connected here. */
const CREDENTIAL_ONLY = new Set(["command", "env"]);

const submitLabel = (device: boolean, pending: boolean, waiting: boolean) => {
  if (waiting) {
    return "Waiting for ChatGPT…";
  }
  if (pending) {
    return device ? "Starting…" : "Adding…";
  }
  return device ? "Connect ChatGPT" : "Add connection";
};

export function ConnectionDialog({
  category,
  integrations: all,
  onClose,
  onCreated,
  open,
}: {
  readonly category: CredentialIntegration["category"] | null;
  readonly integrations: readonly CredentialIntegration[];
  readonly onClose: () => void;
  readonly onCreated: () => void;
  readonly open: boolean;
}) {
  const integrations = all.filter(
    (item) => item.category === category && !CREDENTIAL_ONLY.has(item.id)
  );

  const [integrationId, setIntegrationId] = useState(integrations[0]?.id ?? "");
  const integration = integrations.find((item) => item.id === integrationId);

  const [methodId, setMethodId] = useState(
    integrations[0]?.authMethods[0]?.id ?? ""
  );
  const method = integration?.authMethods.find((item) => item.id === methodId);

  const [name, setName] = useState("");
  const [scope, setScope] = useState("organization");
  const [values, setValues] = useState<Record<string, string>>({});
  const [challenge, setChallenge] = useState<DeviceAuthChallenge | null>(null);
  const [pending, setPending] = useState(false);

  const isDevice = method?.kind === "device";

  const reset = () => {
    setName("");
    setValues({});
    setChallenge(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!challenge) {
      return;
    }

    const interval = window.setInterval(async () => {
      const result = await credentialsClient.deviceStatus(challenge.attemptId);

      if (result.status === "complete") {
        window.clearInterval(interval);
        setName("");
        setValues({});
        setChallenge(null);
        onCreated();
        onClose();
        toast.success("ChatGPT connected");
      }

      if (result.status === "failed" || result.status === "expired") {
        window.clearInterval(interval);
        toast.error(`ChatGPT login ${result.status}`);
      }
    }, POLL_MS);

    return () => window.clearInterval(interval);
  }, [challenge, onClose, onCreated]);

  const chooseIntegration = (id: string) => {
    const selected = integrations.find((item) => item.id === id);

    setIntegrationId(id);
    setMethodId(selected?.authMethods[0]?.id ?? "");
    setValues({});
    setChallenge(null);
  };

  const missing = method !== undefined && incompleteCredential(method, values);

  const submit = async () => {
    if (!(integration && method && name.trim()) || missing) {
      return;
    }

    setPending(true);

    try {
      if (method.kind === "device") {
        setChallenge(
          await credentialsClient.startDevice({
            /* Only codex offers device auth, so only codex can start one. */
            integrationId: "codex",
            name: name.trim(),
            scope: scope === "personal" ? "personal" : "organization",
          })
        );
      } else {
        await credentialsClient.create({
          authMethodId: method.id,
          integrationId: integration.id,
          isDefault: false,
          name: name.trim(),
          scope: scope === "personal" ? "personal" : "organization",
          values,
        });

        reset();
        onCreated();
        onClose();
        toast.success("Connection added");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <FormDialog
      description={
        category === "sandbox"
          ? "Run sandboxes on your own account instead of Anpord's. Secret values are encrypted and never shown again."
          : "The account the agent runs on. Secret values are encrypted and never shown again."
      }
      onClose={close}
      onSubmit={submit}
      open={open}
      title={category === "sandbox" ? "Add sandbox" : "Add harness"}
    >
      <LabelledSelect
        id="connection-integration"
        label={category === "sandbox" ? "Sandbox" : "Harness"}
        onChange={chooseIntegration}
        options={integrations.map((item) => {
          const own = integrationPresentation(item);

          return {
            label: <VariantLabel Icon={own.Icon}>{own.label}</VariantLabel>,
            value: item.id,
          };
        })}
        triggerClassName="w-full"
        value={integrationId}
      />

      {(integration?.authMethods.length ?? 0) > 1 ? (
        <LabelledSelect
          id="connection-method"
          label="Sign in with"
          onChange={(next) => {
            setMethodId(next);
            setValues({});
            setChallenge(null);
          }}
          options={(integration?.authMethods ?? []).map((item) => ({
            label: item.label,
            value: item.id,
          }))}
          triggerClassName="w-full"
          value={methodId}
        />
      ) : null}

      <LabelledField htmlFor="connection-name" label="Name">
        <Input
          autoFocus
          id="connection-name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Team key, personal key…"
          value={name}
        />
      </LabelledField>

      {method !== undefined && method.kind !== "device" ? (
        <CredentialFields
          method={method}
          onChange={(next) => setValues({ ...next })}
          values={values}
        />
      ) : null}

      <LabelledSelect
        id="connection-scope"
        label="Available to"
        onChange={setScope}
        options={[
          { label: "Everyone in the organization", value: "organization" },
          { label: "Only me", value: "personal" },
        ]}
        triggerClassName="w-full"
        value={scope}
      />

      {challenge ? <DeviceChallenge challenge={challenge} /> : null}

      <ShortcutButton
        className="h-10 w-full text-sm"
        disabled={
          pending || challenge !== null || name.trim() === "" || missing
        }
        metaShortcut="enter"
        onClick={submit}
        size="lg"
        type="button"
      >
        {submitLabel(isDevice, pending, challenge !== null)}
      </ShortcutButton>
    </FormDialog>
  );
}
