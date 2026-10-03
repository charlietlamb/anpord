import { CopyButton } from "@sphynx/ui/components/copy-button";
import { LabelledField } from "@sphynx/ui/components/form/labelled-field";
import { Textarea } from "@sphynx/ui/components/ui/textarea";

export function AuthFileField({
  command,
  onChange,
  value,
}: {
  readonly command: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
}) {
  return (
    <LabelledField htmlFor="subscription-auth-file" label="Auth file">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <span className="shrink-0">Copy it with</span>
        <code className="min-w-0 truncate font-mono text-foreground">
          {command}
        </code>
        <CopyButton label="Copy command" size="inline" value={command} />
      </div>
      <Textarea
        className="max-h-60 min-h-28 font-mono text-xs"
        id="subscription-auth-file"
        onChange={(event) => onChange(event.target.value)}
        placeholder="{ ... }"
        spellCheck={false}
        value={value}
      />
    </LabelledField>
  );
}
