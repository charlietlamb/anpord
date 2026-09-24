import { LabelledField } from "@anpord/ui/components/form/labelled-field";
import { Textarea } from "@anpord/ui/components/ui/textarea";
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
    <LabelledField
      description="One KEY=VALUE per line. Blank lines and lines starting with # are ignored."
      htmlFor="credential-env"
      label="Variables"
    >
      <Textarea
        aria-invalid={problem !== null}
        autoComplete="off"
        className="min-h-28 font-mono"
        id="credential-env"
        onChange={(event) => change(event.target.value)}
        placeholder={"OPENAI_API_KEY=sk-…\nANTHROPIC_API_KEY=sk-ant-…"}
        spellCheck={false}
        value={text}
      />
      {problem === null ? null : (
        <p className="text-destructive text-xs">{problem}</p>
      )}
    </LabelledField>
  );
}
