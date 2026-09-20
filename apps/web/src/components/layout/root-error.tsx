import type { ErrorComponentProps } from "@tanstack/react-router";
import { ErrorCard } from "@/components/layout/error-card";
import { RootDocument } from "@/components/layout/root-document";
import { SiteLayout } from "@/components/layout/site-layout";

/* Rendered in place of the root, so it carries the document itself: the theme
   provider lives inside it, and without one the page ignores the theme. */
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
