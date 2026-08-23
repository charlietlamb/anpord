import { CreatePromptRequest } from "@anpord/schema/domain/prompts";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Effect, Schema } from "effect";
import { toast } from "sonner";
import { createPrompt } from "@/lib/prompts-client";

/** Lowercase slug so the handle is URL-safe without the author thinking about
 * it. Exported because the composer shows it as the name is typed. */
export const toId = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Creating a prompt, and going to it.
 *
 * Decoded through the contract rather than cast to it. The call site used
 * `as never` to get past the branded ids, which silences the one check that
 * knows a handle must be lowercase and a name must not be empty -- so a prompt
 * with an invalid id reached the server and failed there instead of here.
 */
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
