import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { handleMutationResult } from "@anpord/ui/lib/mutation-result";
import { useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { orgNameSchema, orgSlugSchema } from "@/lib/organization-schema";

const createOrganizationSchema = z.object({
  name: orgNameSchema,
  slug: orgSlugSchema,
});

export function useCreateOrganizationForm(onCreated: () => void) {
  const router = useRouter();

  return useAppForm({
    defaultValues: { name: "", slug: "" },
    validators: { onChange: createOrganizationSchema },
    onSubmit: async ({ value }) => {
      const result = await authClient.organization.create({
        name: value.name,
        slug: value.slug,
      });
      const created = handleMutationResult(result, {
        errorTitle: "Couldn't create organization",
      });
      if (!created) {
        return;
      }

      await authClient.organization.setActive({
        organizationSlug: value.slug,
      });
      router.invalidate();
      onCreated();
    },
  });
}
