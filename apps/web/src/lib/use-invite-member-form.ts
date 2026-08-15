import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { handleMutationResult } from "@anpord/ui/lib/mutation-result";
import { useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

export const MEMBER_ROLES = ["member", "admin", "owner"] as const;

const inviteMemberSchema = z.object({
  email: z.email("Enter a valid email address."),
  role: z.enum(MEMBER_ROLES),
});

export function useInviteMemberForm(onInvited: () => void) {
  const router = useRouter();

  return useAppForm({
    defaultValues: { email: "", role: "member" } as z.input<
      typeof inviteMemberSchema
    >,
    validators: { onChange: inviteMemberSchema },
    onSubmit: async ({ value }) => {
      const result = await authClient.organization.inviteMember({
        email: value.email,
        role: value.role,
      });
      const invited = handleMutationResult(result, {
        errorTitle: "Couldn't send invitation",
        successTitle: "Invitation sent",
        successDescription: `Invited ${value.email}.`,
      });
      if (!invited) {
        return;
      }
      router.invalidate();
      onInvited();
    },
  });
}
