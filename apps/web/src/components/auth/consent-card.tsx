import { Button } from "@anpord/ui/components/button";
import { Logo } from "@anpord/ui/components/logo";
import { DetailList, DetailRow } from "@anpord/ui/components/ui/detail-list";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { Surface } from "@anpord/ui/components/ui/surface";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { authClient, useSession } from "@/lib/auth-client";

const SCOPE_LABELS: Record<string, string> = {
  "channels:read": "Read your prompt channels",
  "channels:write": "Move prompt channels",
  email: "See your email address",
  "evals:read": "Read your eval runs and results",
  "evals:write": "Start and rerun evals",
  offline_access: "Stay signed in when you are away",
  openid: "Confirm who you are",
  profile: "See your name and picture",
  "prompts:read": "Read your prompts",
  "prompts:write": "Create and update your prompts",
};

interface ConsentCardProps {
  readonly clientName: string;
  readonly organizationName?: string;
  readonly scopes: readonly string[];
}

export function ConsentCard({
  clientName,
  organizationName,
  scopes,
}: ConsentCardProps) {
  const { data: session } = useSession();
  const decision = useMutation({
    mutationFn: async (accept: boolean) => {
      const { data, error } = await authClient.oauth2.consent({ accept });

      if (error || !data?.redirectURI) {
        throw new Error("Consent was not recorded.");
      }

      window.location.href = data.redirectURI;
    },
  });

  const submitting = decision.isPending;

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <Logo className="mb-4 size-11" />
        <h1 className="flex max-w-full">
          <PageHeading title={clientName} />
        </h1>
        <p className="text-muted-foreground text-sm">
          wants to access your Anpord account
        </p>
      </div>

      {session?.user || organizationName ? (
        <DetailList label="Account">
          {session?.user ? (
            <DetailRow label="Signed in as">{session.user.email}</DetailRow>
          ) : null}
          {organizationName ? (
            <DetailRow label="Organization">{organizationName}</DetailRow>
          ) : null}
        </DetailList>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="px-1">
          <PageHeading size="label" title={`Permissions for ${clientName}`} />
        </h2>
        <Surface>
          <ul className="divide-y divide-border">
            {scopes.map((scope) => (
              <li
                className="flex items-center gap-2.5 px-4 py-2.5 text-label"
                key={scope}
              >
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-primary"
                />
                {SCOPE_LABELS[scope] ?? scope}
              </li>
            ))}
          </ul>
        </Surface>
      </section>

      <p className="flex items-center gap-2 text-muted-foreground text-xs">
        <ClockCounterClockwiseIcon className="size-3.5 shrink-0" />
        You can revoke access at any time from your settings.
      </p>

      {decision.isError ? (
        <p className="text-center text-destructive text-xs">
          That did not go through. Try again.
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button
          className="flex-1"
          disabled={submitting}
          onClick={() => decision.mutate(false)}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={submitting}
          onClick={() => decision.mutate(true)}
        >
          Authorize
        </Button>
      </div>
    </div>
  );
}
