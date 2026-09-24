import { Label } from "@anpord/ui/components/ui/label";
import { Textarea } from "@anpord/ui/components/ui/textarea";
import { cn } from "@anpord/ui/lib/utils";
import { useState } from "react";
import { parseEnvLines } from "@/lib/settings/env-lines";

export function EnvFields({
  onChange,
}: {
  readonly onChange: (values: Readonly<Record<string, string>>) => void;
}) {
  const [text, setText] = useState("");
  const { problem } = parseEnvLines(text);

  const change = (next: string) => {
    setText(next);
    onChange(parseEnvLines(next).values ?? {});
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
        className={cn(
          "text-xs",
          problem === null ? "text-muted-foreground" : "text-destructive"
        )}
        id="credential-env-help"
      >
        {problem ??
          "One KEY=VALUE per line. Blank lines and lines starting with # are ignored."}
      </p>
    </div>
  );
}
