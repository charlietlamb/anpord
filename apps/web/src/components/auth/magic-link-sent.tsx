import { Button } from "@anpord/ui/components/button";
import { Logo } from "@anpord/ui/components/logo";
import { PanelCard } from "@/components/layout/panel-card";

export function MagicLinkSent({
  email,
  onBack,
}: {
  readonly email: string;
  readonly onBack: () => void;
}) {
  return (
    <PanelCard
      description={
        <>
          We sent a sign-in link to{" "}
          <span className="text-foreground">{email}</span>. It expires in five
          minutes.
        </>
      }
      heading="h1"
      mark={<Logo className="size-[26px]" />}
      title="Check your email"
    >
      <Button
        className="mt-6 w-full"
        onClick={onBack}
        type="button"
        variant="outline"
      >
        Use a different email
      </Button>
    </PanelCard>
  );
}
