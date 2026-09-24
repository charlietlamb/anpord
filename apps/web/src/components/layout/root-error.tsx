import type { ErrorComponentProps } from "@tanstack/react-router";
import { ErrorCard } from "@/components/layout/error-card";
import { RootDocument } from "@/components/layout/root-document";
import { SiteLayout } from "@/components/layout/site-layout";

export function RootErrorComponent({ error, reset }: ErrorComponentProps) {
  return (
    <RootDocument>
      <SiteLayout center>
        <ErrorCard
          description="Something went wrong while loading this page."
          detail={error.message}
          onRetry={reset}
          title="Unexpected error"
        />
      </SiteLayout>
    </RootDocument>
  );
}
