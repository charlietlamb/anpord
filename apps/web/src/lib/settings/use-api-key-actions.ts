import { toast } from "sonner";
import { useDialog } from "@/lib/dialog/dialogs";
import {
  useCreateApiKey,
  useRevokeApiKey,
} from "@/lib/query/use-api-key-mutations";

export const useApiKeyActions = (organizationId: string) => {
  const { close, open, replace } = useDialog();
  const create = useCreateApiKey();
  const revoke = useRevokeApiKey();

  const onNew = () =>
    open("newApiKey", {
      onSubmit: (name) =>
        create.mutateAsync({ name, organizationId }).then(
          (created) => {
            if (created?.key) {
              replace("apiKeyCreated", { apiKey: created.key, name });
              return;
            }
            close();
          },
          (error: Error) => {
            toast.error("Couldn't create the key", {
              description: error.message,
            });
          }
        ),
    });

  const onRevoke = (id: string, name: string) =>
    open("confirm", {
      confirmLabel: `Revoke ${name}`,
      description:
        "Anything using this key stops working within a few seconds. This cannot be undone.",
      destructive: true,
      onConfirm: () =>
        revoke.mutate(id, {
          onError: (error) =>
            toast.error("Couldn't revoke the key", {
              description: error.message,
            }),
          onSuccess: () => toast.success(`Revoked ${name}`),
        }),
      title: `Revoke ${name}?`,
    });

  return { onNew, onRevoke };
};
