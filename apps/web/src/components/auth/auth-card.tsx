import { Button } from "@anpord/ui/components/button";
import { Input } from "@anpord/ui/components/input";
import { Logo } from "@anpord/ui/components/logo";
import { type SyntheticEvent, useState } from "react";
import { MagicLinkSent } from "@/components/auth/magic-link-sent";
import { sendMagicLink, signInWithGithub } from "@/components/auth/sign-in";
import { GithubIcon } from "@/components/icons/github-icon";

interface AuthCardProps {
  redirect: string;
}

export function AuthCard({ redirect }: AuthCardProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return <MagicLinkSent email={sentTo} onBack={() => setSentTo(null)} />;
  }

  const onSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || sending) {
      return;
    }
    setSending(true);
    try {
      if (await sendMagicLink(trimmed, redirect)) {
        setSentTo(trimmed);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-lg border bg-background p-8">
      <div className="flex items-center gap-2">
        <Logo className="size-[26px]" />
        <h1 className="font-heading text-xl tracking-tight">Sign in</h1>
      </div>
      <p className="mt-3 text-muted-foreground text-sm">
        Pick up where you left off.
      </p>

      <Button
        className="mt-6 w-full"
        onClick={() => signInWithGithub(redirect)}
        type="button"
        variant="outline"
      >
        <GithubIcon />
        Sign in with GitHub
      </Button>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-muted-foreground text-xs">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form className="flex flex-col gap-2" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="email">
          Email address
        </label>
        <Input
          autoComplete="email"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
        <Button disabled={sending} type="submit">
          {sending ? "Sending…" : "Send magic link"}
        </Button>
      </form>
    </div>
  );
}
