import { CreatePromptRequest } from "@anpord/schema/domain/prompts";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Effect, Schema } from "effect";
import { toast } from "sonner";
import { createPrompt } from "@/lib/prompts-client";

export const toId = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/* Decoded through the contract, not cast: a cast past the branded ids skips the id and name checks. */
export function useCreatePrompt() {
  const navigate = useNavigate();

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
    onError: (error: unknown) => {
      toast.error("Couldn't create the prompt", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
    onSuccess: (prompt) => {
      toast.success("Prompt created", { description: "Live on production." });
      navigate({ params: { id: prompt.id }, to: "/prompts/$id" });
    },
  });
}
