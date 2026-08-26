import type {
  CredentialIntegration,
  DeviceAuthChallenge,
} from "@anpord/schema/domain/credentials";
import { Button } from "@anpord/ui/components/button";
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
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { VariantLabel } from "@/components/evals/variant-label";
import { CredentialFields } from "@/components/settings/credential-fields";
import { credentialsClient } from "@/lib/credentials-client";
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

/**
 * A ChatGPT login in progress: the address to open and the code to type.
 *
 * The code is the thing a reader has to carry to another window, so it is
 * set large, in mono, with a copy control beside it rather than buried in a
 * sentence.
 */
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

/**
 * Adds a credential the evals can use.
 *
 * A dialog rather than a card at the top of the list: the list is what the
 * page is for, and a form that sits above it pushes the thing it exists to
 * add below the fold. Opened when asked for, like every other settings form.
 *
 * What a reader is choosing here -- a vendor, then how to authenticate with
 * it, then the secret itself -- is a sequence, and reads down as one. The
 * method is asked about only where there is a choice: a vendor with one way
 * in is not a question.
 */
export function ConnectionDialog({
  category,
  integrations: all,
  onClose,
  onCreated,
  open,
}: {
  /** Which section asked. Null only while the dialog is closed. */
  readonly category: CredentialIntegration["category"] | null;
  readonly integrations: readonly CredentialIntegration[];
  readonly onClose: () => void;
  readonly onCreated: () => void;
  readonly open: boolean;
}) {
  /* Scoped to the section that opened it, so "Add sandbox" cannot offer a
     harness. The dialog is keyed on the category by its caller, so this list
     and the state below are rebuilt rather than left pointing at the other
     section's first vendor. */
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

  /* Choosing a vendor invalidates everything under it: the methods differ, so
     the fields differ, and a secret typed for one is not a secret for the
     next. */
  const chooseIntegration = (id: string) => {
    const selected = integrations.find((item) => item.id === id);

    setIntegrationId(id);
    setMethodId(selected?.authMethods[0]?.id ?? "");
    setValues({});
    setChallenge(null);
  };

  const missing =
    method?.kind === "secret" &&
    method.fields.some(
      (field) => field.required && !values[field.name]?.trim()
    );

  const submit = async () => {
    if (!(integration && method && name.trim()) || missing) {
      return;
    }

    setPending(true);

    try {
      if (method.kind === "device") {
        setChallenge(
          await credentialsClient.startDevice({
            /* Device auth is a ChatGPT login, and the schema says so: only
               codex offers it, so only codex can start one. */
            integrationId: "codex",
            name: name.trim(),
            scope: "personal",
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

      {method?.kind === "secret" ? (
        <CredentialFields
          method={method}
          onChange={(field, value) =>
            setValues((current) => ({ ...current, [field]: value }))
          }
          values={values}
        />
      ) : null}

      {isDevice ? null : (
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
      )}

      {challenge ? <DeviceChallenge challenge={challenge} /> : null}

      <div className="flex items-center justify-end gap-4 pt-1">
        <Button
          disabled={
            pending || challenge !== null || name.trim() === "" || missing
          }
          size="sm"
          type="submit"
        >
          {isDevice ? "Connect ChatGPT" : "Add connection"}
        </Button>
      </div>
    </FormDialog>
  );
}
