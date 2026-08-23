import type {
  CredentialAuthMethod,
  CredentialIntegration,
  DeviceAuthChallenge,
} from "@anpord/schema/domain/credentials";
import { Button } from "@anpord/ui/components/button";
import { Input } from "@anpord/ui/components/input";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { credentialsClient } from "@/lib/credentials-client";

const selectClass =
  "h-[1.875rem] rounded-lg border border-border bg-background px-3 text-sm";

export function ConnectionForm({
  integrations,
  onCreated,
}: {
  readonly integrations: readonly CredentialIntegration[];
  readonly onCreated: () => void;
}) {
  const [integrationId, setIntegrationId] = useState(integrations[0]?.id ?? "");
  const integration =
    integrations.find((item) => item.id === integrationId) ?? integrations[0];
  const [methodId, setMethodId] = useState(
    integration?.authMethods[0]?.id ?? ""
  );
  const method =
    integration?.authMethods.find((item) => item.id === methodId) ??
    integration?.authMethods[0];
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"organization" | "personal">(
    "organization"
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [challenge, setChallenge] = useState<DeviceAuthChallenge | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!challenge) {
      return;
    }
    const interval = window.setInterval(async () => {
      const result = await credentialsClient.deviceStatus(challenge.attemptId);
      if (result.status === "complete") {
        window.clearInterval(interval);
        setChallenge(null);
        setName("");
        onCreated();
        toast.success("ChatGPT connected");
      }
      if (result.status === "failed" || result.status === "expired") {
        window.clearInterval(interval);
        toast.error(`ChatGPT login ${result.status}`);
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [challenge, onCreated]);

  const chooseIntegration = (id: string) => {
    const selected = integrations.find((item) => item.id === id);
    setIntegrationId(id);
    setMethodId(selected?.authMethods[0]?.id ?? "");
    setValues({});
    setChallenge(null);
  };

  const submit = async () => {
    if (!(integration && method && name.trim())) {
      return;
    }
    setPending(true);
    try {
      if (method.kind === "device") {
        const started = await credentialsClient.startDevice({
          integrationId: "codex",
          name: name.trim(),
          scope: "personal",
        });
        setChallenge(started);
      } else {
        await credentialsClient.create({
          authMethodId: method.id,
          integrationId: integration.id,
          isDefault: false,
          name: name.trim(),
          scope,
          values,
        });
        setName("");
        setValues({});
        onCreated();
        toast.success("Connection added");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid gap-3 rounded-xl border border-border p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          aria-label="Integration"
          className={selectClass}
          onChange={(event) => chooseIntegration(event.target.value)}
          value={integration?.id}
        >
          {integrations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Authentication method"
          className={selectClass}
          onChange={(event) => {
            setMethodId(event.target.value);
            setChallenge(null);
          }}
          value={method?.id}
        >
          {integration?.authMethods.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <Input
          aria-label="Connection name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Connection name"
          value={name}
        />
      </div>
      {method?.kind === "secret" ? (
        <CredentialFields
          method={method}
          onChange={(field, value) =>
            setValues((current) => ({ ...current, [field]: value }))
          }
          values={values}
        />
      ) : null}
      <div className="flex items-center justify-between gap-3">
        {method?.kind === "device" ? (
          <span className="text-muted-foreground text-sm">
            ChatGPT connections are always personal.
          </span>
        ) : (
          <select
            aria-label="Scope"
            className={selectClass}
            onChange={(event) =>
              setScope(event.target.value as "organization" | "personal")
            }
            value={scope}
          >
            <option value="organization">Organization</option>
            <option value="personal">Personal</option>
          </select>
        )}
        <Button disabled={pending || !name.trim()} onClick={submit} size="sm">
          {method?.kind === "device" ? "Connect ChatGPT" : "Add connection"}
        </Button>
      </div>
      {challenge ? (
        <div className="rounded-lg bg-muted p-3 text-sm">
          Open{" "}
          <a
            className="underline"
            href={challenge.verificationUrl}
            rel="noreferrer"
            target="_blank"
          >
            {challenge.verificationUrl}
          </a>{" "}
          and enter <strong>{challenge.code}</strong>.
        </div>
      ) : null}
    </div>
  );
}

export function CredentialFields({
  method,
  onChange,
  values,
}: {
  readonly method: CredentialAuthMethod;
  readonly onChange: (field: string, value: string) => void;
  readonly values: Readonly<Record<string, string>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {method.fields.map((field) => (
        <Input
          aria-label={field.label}
          key={field.name}
          onChange={(event) => onChange(field.name, event.target.value)}
          placeholder={field.label}
          required={field.required}
          type={field.secret ? "password" : "text"}
          value={values[field.name] ?? ""}
        />
      ))}
    </div>
  );
}
