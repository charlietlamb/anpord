import { Label } from "@anpord/ui/components/ui/label";
import { Textarea } from "@anpord/ui/components/ui/textarea";
import { useState } from "react";
import { parseEnvLines } from "@/lib/settings/env-lines";

/* Only the parsed map is handed up, so the form above never holds a half-typed line. */
export function EnvFields({
  onChange,
}: {
  readonly onChange: (values: Readonly<Record<string, string>>) => void;
}) {
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const change = (next: string) => {
    const parsed = parseEnvLines(next);

    setText(next);
    setProblem(parsed.problem);
    onChange(parsed.values ?? {});
  };

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="credential-env">Variables</Label>
      <Textarea
        aria-describedby="credential-env-help"
        aria-invalid={problem !== null}
        autoComplete="off"
        className="min-h-28 font-mono"
        id="credential-env"
        onChange={(event) => change(event.target.value)}
        placeholder={"OPENAI_API_KEY=sk-…\nANTHROPIC_API_KEY=sk-ant-…"}
        spellCheck={false}
        value={text}
      />
      <p
        className={
          problem === null
            ? "text-muted-foreground text-xs"
            : "text-destructive text-xs"
        }
        id="credential-env-help"
      >
        {problem ??
          "One KEY=VALUE per line. Blank lines and lines starting with # are ignored."}
      </p>
    </div>
  );
}
