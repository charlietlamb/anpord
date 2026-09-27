import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { cn } from "@anpord/ui/lib/utils";
import { useState } from "react";
import { z } from "zod";
import { MagicLinkSent } from "@/components/auth/magic-link-sent";
import { sendMagicLink, signInWithGithub } from "@/components/auth/sign-in";
import { GithubIcon } from "@/components/icons/github-icon";

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("That does not look like an email address."),
});

const CONTROL =
  "flex h-10 w-full items-center justify-center gap-2 rounded-[4px] text-[14px] transition-colors duration-150";

export function SignInForm({ redirect }: { readonly redirect: string }) {
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
    <div className="flex w-full max-w-[360px] flex-col gap-7">
      <div className="flex flex-col gap-2.5">
        <h1 className="font-light text-[32px] leading-[33px] tracking-[-0.03em]">
          Sign in
        </h1>
        <p className="font-light text-[15px] text-muted-foreground leading-[18px]">
          Pick up where you left off.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <button
          className={cn(
            CONTROL,
            "bg-foreground/[0.03] ring-1 ring-foreground/15 ring-inset hover:bg-foreground/[0.06]"
          )}
          onClick={() => signInWithGithub(redirect)}
          type="button"
        >
          <GithubIcon className="size-4" />
          Sign in with GitHub
        </button>
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground/60 leading-4">
          <span className="h-px flex-1 bg-foreground/10" />
          or
          <span className="h-px flex-1 bg-foreground/10" />
        </div>
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="email">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <input
                  aria-invalid={field.state.meta.errors.length > 0}
                  aria-label="Email address"
                  autoComplete="email"
                  className="h-10 w-full rounded-[4px] bg-foreground/[0.02] px-3.5 font-light text-[14px] outline-none ring-1 ring-foreground/15 ring-inset transition-shadow duration-150 placeholder:text-muted-foreground/60 focus-visible:ring-foreground/40 aria-invalid:ring-destructive/60"
                  id={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={field.state.value}
                />
                {field.state.meta.errors.length === 0 ? null : (
                  <p className="text-[13px] text-destructive">
                    {field.state.meta.errors
                      .map((error) =>
                        typeof error === "string" ? error : error?.message
                      )
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(submitting) => (
              <button
                className={cn(
                  CONTROL,
                  "bg-foreground font-[450] text-background hover:opacity-85 disabled:opacity-60"
                )}
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Sending…" : "Send magic link"}
              </button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  );
}
