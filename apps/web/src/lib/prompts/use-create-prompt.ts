import { CreatePromptRequest } from "@anpord/schema/domain/prompts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Effect, Schema } from "effect";
import { toast } from "sonner";
import { createPrompt } from "@/lib/prompts-client";
import { promptKeys } from "@/lib/query/prompt-keys";

export const toId = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function useCreatePrompt() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { readonly content: string; readonly name: string }) =>
      Effect.runPromise(
        Schema.decodeUnknown(CreatePromptRequest)({
          content: input.content.trim(),
          id: toId(input.name),
          name: input.name.trim(),
        }).pipe(
          Effect.flatMap((body) => Effect.promise(() => createPrompt(body)))
        )
      ),
    onError: (error: Error) => {
      toast.error("Couldn't create the prompt", {
        description: error.message,
      });
    },
    onSuccess: (prompt) => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
      toast.success("Prompt created", { description: "Live on production." });
      navigate({ params: { id: prompt.id }, to: "/prompts/$id" });
    },
  });
}
