import { Button } from "@anpord/ui/components/button";
import { CodeBlock } from "@anpord/ui/components/ui/code-block";
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
          <CodeBlock
            className="mt-4 max-h-48 border text-muted-foreground"
            copyValue={detail}
          >
            {detail}
          </CodeBlock>
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
