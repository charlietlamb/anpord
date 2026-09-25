import { EmptyValue } from "@/components/evals/empty-value";

export function PromptValue({ prompt }: { readonly prompt: string | null }) {
  if (prompt === null || prompt.trim() === "") {
    return <EmptyValue>Not recorded</EmptyValue>;
  }

  return (
    <p className="max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
      {prompt}
    </p>
  );
}
