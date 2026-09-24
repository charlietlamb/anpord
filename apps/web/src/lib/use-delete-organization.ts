import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export function useDeleteOrganization() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { error } = await authClient.organization.delete({
        organizationId,
      });
      if (error) {
        throw new Error(error.message ?? "Please try again.");
      }
    },
    onError: (error) =>
      toast.error("Couldn't delete organization", {
        description: error.message,
      }),
    onSuccess: () => {
      toast.success("Organization deleted");
      queryClient.invalidateQueries();
      router.invalidate();
    },
  });
}
