import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { handleMutationResult } from "@anpord/ui/lib/mutation-result";
import { useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { orgNameSchema, orgSlugSchema } from "@/lib/organization-schema";

const organizationSettingsSchema = z.object({
  name: orgNameSchema,
  slug: orgSlugSchema,
});

interface OrganizationSettingsDefaults {
  name: string;
  slug: string;
}

export function useOrganizationSettingsForm(
  defaults: OrganizationSettingsDefaults
) {
  const router = useRouter();

  return useAppForm({
    defaultValues: defaults,
    validators: { onChange: organizationSettingsSchema },
    onSubmit: async ({ value }) => {
      const result = await authClient.organization.update({
        data: { name: value.name, slug: value.slug },
      });
      handleMutationResult(result, {
        errorTitle: "Couldn't save changes",
        successTitle: "Organization updated",
        onSuccess: () => router.invalidate(),
      });
    },
  });
}
