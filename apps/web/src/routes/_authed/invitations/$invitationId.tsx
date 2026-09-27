import { Button } from "@anpord/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ErrorCard } from "@/components/layout/error-card";
import { PageShell } from "@/components/layout/page-shell";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authed/invitations/$invitationId")({
  component: InvitationRoute,
  ssr: false,
  staticData: { title: "Invitation" },
});

function InvitationRoute() {
  const { invitationId } = Route.useParams();
  const navigate = useNavigate();

  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (error) {
        throw new Error(
          error.message ?? "The invitation could not be accepted."
        );
      }
    },
    onSuccess: () => navigate({ to: "/evals" }),
  });

  if (accept.isError) {
    return (
      <ErrorCard
        description={accept.error.message}
        title="Could not accept this invitation"
      />
    );
  }

  return (
    <PageShell
      description="Accepting adds you to the organization that invited you."
      title="Join this organization"
    >
      <Button
        disabled={accept.isPending}
        onClick={() => accept.mutate()}
        type="button"
      >
        {accept.isPending ? "Joining…" : "Accept invitation"}
      </Button>
    </PageShell>
  );
}
