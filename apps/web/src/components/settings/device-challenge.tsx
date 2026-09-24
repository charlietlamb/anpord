import type { DeviceAuthChallenge } from "@anpord/schema/domain/credentials";
import { CopyButton } from "@anpord/ui/components/copy-button";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";

export function DeviceChallenge({
  challenge,
}: {
  readonly challenge: DeviceAuthChallenge;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3.5">
      <p className="text-muted-foreground text-xs">
        Open the link below, enter this code, and this window will finish on its
        own.
      </p>

      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-foreground text-lg tracking-[0.2em]">
          {challenge.code}
        </span>
        <CopyButton label="Copy code" value={challenge.code} />
      </div>

      <a
        className="inline-flex w-fit items-center gap-1.5 text-foreground text-xs underline decoration-border underline-offset-4 transition-colors duration-150 ease-out hover:decoration-foreground"
        href={challenge.verificationUrl}
        rel="noreferrer"
        target="_blank"
      >
        {challenge.verificationUrl}
        <ArrowSquareOutIcon aria-hidden="true" className="size-3.5" />
      </a>
    </div>
  );
}
