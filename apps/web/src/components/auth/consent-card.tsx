import { Button } from "@anpord/ui/components/button";
import { Logo } from "@anpord/ui/components/logo";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";

const SCOPE_LABELS: Record<string, string> = {
  email: "See your email address",
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
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  /** The success path keeps the buttons disabled, because a redirect follows. */
  const decide = async (accept: boolean) => {
    setSubmitting(true);
    setFailed(false);
    try {
      const { data, error } = await authClient.oauth2.consent({ accept });
      if (error || !data?.redirectURI) {
        setFailed(true);
        setSubmitting(false);
        return;
      }
      window.location.href = data.redirectURI;
    } catch {
      setFailed(true);
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] space-y-6">
      <div className="flex justify-center">
        <Logo className="size-11" />
      </div>

      <div className="space-y-1.5 text-center">
        <h1 className="font-heading text-lg tracking-tight">{clientName}</h1>
        <p className="text-muted-foreground text-sm">
          wants to access your Anpord account
        </p>
        {session?.user ? (
          <p className="text-muted-foreground text-xs">
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {session.user.email}
            </span>
          </p>
        ) : null}
      </div>

      {organizationName ? (
        <div className="overflow-hidden rounded-xl border border-border-surface bg-card shadow-raised">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="shrink-0 text-muted-foreground text-sm">
              Organization
            </span>
            <span className="truncate font-medium text-sm">
              {organizationName}
            </span>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border-surface bg-card shadow-raised">
        <div className="border-border border-b bg-muted/30 px-4 py-3">
          <p className="font-medium text-muted-foreground text-xs">
            Permissions for {clientName}
          </p>
        </div>
        <ul className="divide-y divide-border">
          {scopes.map((scope) => (
            <li className="flex items-start gap-2.5 px-4 py-2.5" key={scope}>
              <span
                aria-hidden="true"
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
              />
              <span className="text-sm">{SCOPE_LABELS[scope] ?? scope}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2 text-muted-foreground text-xs">
        <div className="flex items-center gap-2">
          <ClockCounterClockwiseIcon className="size-3.5 shrink-0" />
          <span>You can revoke access at any time from your settings.</span>
        </div>
      </div>

      {failed ? (
        <p className="text-center text-destructive text-xs">
          That did not go through. Try again.
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button
          className="flex-1"
          disabled={submitting}
          onClick={() => decide(false)}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={submitting}
          onClick={() => decide(true)}
        >
          Authorize
        </Button>
      </div>
    </div>
  );
}
