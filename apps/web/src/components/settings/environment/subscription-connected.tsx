import { CheckCircleIcon } from "@phosphor-icons/react";
import { Button } from "@sphynx/ui/components/button";

export function SubscriptionConnected({
  message,
  onDone,
}: {
  readonly message: string;
  readonly onDone: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5 text-sm">
        <CheckCircleIcon
          aria-hidden="true"
          className="size-5 shrink-0 text-success"
          weight="fill"
        />
        <p className="text-foreground">{message}</p>
      </div>
      <Button onClick={onDone} size="lg">
        Done
      </Button>
    </>
  );
}
