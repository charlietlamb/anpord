import { Button } from "@anpord/ui/components/button";
import { CopyButton } from "@anpord/ui/components/copy-button";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { PanelCard } from "@/components/layout/panel-card";
import { SiteLayout } from "@/components/layout/site-layout";

interface ErrorCardProps {
  description: string;
  detail?: string;
  onRetry?: () => void;
  title: string;
}

export function ErrorCard({
  title,
  description,
  detail,
  onRetry,
}: ErrorCardProps) {
  return (
    <SiteLayout center>
      <PanelCard description={description} heading="h1" title={title}>
        {detail ? (
          <div className="relative mt-4">
            <CopyButton
              className="absolute top-1 right-1"
              label="Copy error"
              value={detail}
            />
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/40 py-2.5 pr-10 pl-3 font-mono text-muted-foreground text-xs leading-relaxed">
              {detail}
            </pre>
          </div>
        ) : null}
        <div className="mt-6 flex items-center gap-2">
          {onRetry ? (
            <Button onClick={onRetry} size="sm" type="button">
              Try again
            </Button>
          ) : null}
          <Link
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            to="/"
          >
            Back home
          </Link>
        </div>
      </PanelCard>
    </SiteLayout>
  );
}
