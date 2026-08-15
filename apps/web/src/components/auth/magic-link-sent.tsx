import { Button } from "@anpord/ui/components/button";
import { Logo } from "@anpord/ui/components/logo";

interface MagicLinkSentProps {
  email: string;
  onBack: () => void;
}

export function MagicLinkSent({ email, onBack }: MagicLinkSentProps) {
  return (
    <div className="w-full max-w-sm rounded-lg border bg-background p-8">
      <div className="flex items-center gap-2">
        <Logo className="size-[26px]" />
        <h1 className="font-heading text-xl tracking-tight">
          Check your email
        </h1>
      </div>
      <p className="mt-3 text-muted-foreground text-sm">
        We sent a sign-in link to{" "}
        <span className="text-foreground">{email}</span>. It expires in five
        minutes.
      </p>
      <Button
        className="mt-6 w-full"
        onClick={onBack}
        type="button"
        variant="outline"
      >
        Use a different email
      </Button>
    </div>
  );
}
