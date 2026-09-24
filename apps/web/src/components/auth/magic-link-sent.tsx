import { Button } from "@anpord/ui/components/button";
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
      title="Check your email"
    >
      <Button
        className="w-full"
        onClick={onBack}
        size="lg"
        type="button"
        variant="outline"
      >
        Use a different email
      </Button>
    </PanelCard>
  );
}
