import { ErrorCard } from "@/components/layout/error-card";

export function RootNotFound() {
  return (
    <ErrorCard
      description="We couldn't find the page you were looking for."
      title="Page not found"
    />
  );
}
