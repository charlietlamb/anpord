import { Button } from "@anpord/ui/components/button";
import { Logo } from "@anpord/ui/components/logo";
import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { useState } from "react";
import { z } from "zod";
import { MagicLinkSent } from "@/components/auth/magic-link-sent";
import { sendMagicLink, signInWithGithub } from "@/components/auth/sign-in";
import { GithubIcon } from "@/components/icons/github-icon";
import { PanelCard } from "@/components/layout/panel-card";

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("That does not look like an email address."),
});

/**
 * Signing in, by GitHub or by link.
 *
 * `sentTo` is the only state here: which address the link went to, which is
 * what the confirmation reads back and what a reader corrects if they mistyped
 * it. Everything else the form owns -- the value, whether it is valid, whether
 * it is in flight -- because a form that tracked those by hand is a form that
 * disagrees with itself about whether the button should be disabled.
 */
export function AuthCard({ redirect }: { readonly redirect: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      const email = value.email.trim();

      if (await sendMagicLink(email, redirect)) {
        setSentTo(email);
      }
    },
    validators: { onSubmit: emailSchema },
  });

  if (sentTo !== null) {
    return <MagicLinkSent email={sentTo} onBack={() => setSentTo(null)} />;
  }

  return (
    <PanelCard
      description="Pick up where you left off."
      heading="h1"
      mark={<Logo className="size-[26px]" />}
      title="Sign in"
    >
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

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
        <form.AppField name="email">
          {(field) => (
            <field.TextField
              autoComplete="email"
              hideLabel
              label="Email address"
              placeholder="you@example.com"
              type="email"
            />
          )}
        </form.AppField>

        <form.AppForm>
          <form.SubmitButton label="Send magic link" loadingLabel="Sending…" />
        </form.AppForm>
      </form>
    </PanelCard>
  );
}
