import { Button } from "@anpord/ui/components/button";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const SCOPE_LABELS: Record<string, string> = {
  email: "See your email address",
  openid: "Confirm who you are",
  profile: "See your name and picture",
  "prompts:read": "Read your prompts",
  "prompts:write": "Create and update your prompts",
};

interface ConsentCardProps {
  readonly clientName: string;
  readonly scopes: readonly string[];
}

export function ConsentCard({ clientName, scopes }: ConsentCardProps) {
  const [pending, setPending] = useState(false);

  const decide = async (accept: boolean) => {
    setPending(true);
    const { data, error } = await authClient.oauth2.consent({ accept });
    if (error || !data?.redirectURI) {
      setPending(false);
      return;
    }
    window.location.href = data.redirectURI;
  };

  return (
    <div className="w-full max-w-sm rounded-[18px] border border-border-surface bg-card p-6 shadow-elevated">
      <h1 className="font-heading text-xl tracking-tight">
        {clientName} wants access
      </h1>
      <p className="mt-1.5 text-muted-foreground text-sm">
        It will act as you, in the organization you have open.
      </p>

      <ul className="mt-5 space-y-2 border-border border-t pt-5">
        {scopes.map((scope) => (
          <li className="flex gap-2.5 text-sm" key={scope}>
            <span aria-hidden="true" className="text-muted-foreground">
              &middot;
            </span>
            {SCOPE_LABELS[scope] ?? scope}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex gap-2">
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() => decide(true)}
          size="sm"
        >
          Allow
        </Button>
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() => decide(false)}
          size="sm"
          variant="outline"
        >
          Deny
        </Button>
      </div>
    </div>
  );
}
