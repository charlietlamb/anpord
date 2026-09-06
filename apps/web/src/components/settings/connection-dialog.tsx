import type {
  CredentialIntegration,
  DeviceAuthChallenge,
} from "@anpord/schema/domain/credentials";
import { CopyButton } from "@anpord/ui/components/copy-button";
import { FormDialog } from "@anpord/ui/components/dialog/form-dialog";
import { Input } from "@anpord/ui/components/input";
import { Label } from "@anpord/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@anpord/ui/components/ui/select";
import { ShortcutButton } from "@anpord/ui/components/ui/shortcut-button";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { VariantLabel } from "@/components/evals/variant-label";
import { CredentialFields } from "@/components/settings/credential-fields";
import { credentialsClient } from "@/lib/credentials-client";
import { incompleteCredential } from "@/lib/settings/credential-values";
import { integrationPresentation } from "@/lib/settings/integration-presentation";

const POLL_MS = 2000;

function Field({
  children,
  htmlFor,
  label,
}: {
  readonly children: ReactNode;
  readonly htmlFor: string;
  readonly label: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function Choice({
  id,
  label,
  onChange,
  options,
  value,
}: {
  readonly id: string;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly {
    readonly label: ReactNode;
    readonly value: string;
  }[];
  readonly value: string;
}) {
  return (
    <Field htmlFor={id} label={label}>
      <Select
        items={options}
        onValueChange={(next) => onChange(String(next ?? ""))}
        value={value}
      >
        <SelectTrigger className="w-full" id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function DeviceChallenge({
  challenge,
}: {
  readonly challenge: DeviceAuthChallenge;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-faint bg-muted/30 p-3.5">
      <p className="text-muted-foreground text-xs">
        Open the link below, enter this code, and this window will finish on its
        own.
      </p>

      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-foreground text-lg tracking-[0.2em]">
          {challenge.code}
        </span>
        <CopyButton label="Copy code" value={challenge.code} />
      </div>

      <a
        className="inline-flex w-fit items-center gap-1.5 text-foreground text-xs underline decoration-border underline-offset-4 transition-colors duration-150 ease-out hover:decoration-foreground"
        href={challenge.verificationUrl}
        rel="noreferrer"
        target="_blank"
      >
        {challenge.verificationUrl}
        <ArrowSquareOutIcon aria-hidden="true" className="size-3.5" />
      </a>
    </div>
  );
}

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
  const integrations = all.filter((item) => item.category === category);

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
      <Choice
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
        value={integrationId}
      />

      {(integration?.authMethods.length ?? 0) > 1 ? (
        <Choice
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
          value={methodId}
        />
      ) : null}

      <Field htmlFor="connection-name" label="Name">
        <Input
          autoFocus
          id="connection-name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Team key, personal key…"
          value={name}
        />
      </Field>

      {method !== undefined && method.kind !== "device" ? (
        <CredentialFields
          method={method}
          onChange={(next) => setValues({ ...next })}
          values={values}
        />
      ) : null}

      <Choice
        id="connection-scope"
        label="Available to"
        onChange={setScope}
        options={[
          { label: "Everyone in the organization", value: "organization" },
          { label: "Only me", value: "personal" },
        ]}
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
