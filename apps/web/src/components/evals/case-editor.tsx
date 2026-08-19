import type { EvalCase, EvalSource } from "@anpord/schema/domain/evals";
import { Button } from "@anpord/ui/components/button";
import { Input } from "@anpord/ui/components/input";
import { Label } from "@anpord/ui/components/ui/label";
import { Textarea } from "@anpord/ui/components/ui/textarea";
import { TrashIcon } from "@phosphor-icons/react";

const SOURCE_KINDS = [
  { hint: "the agent builds from nothing", label: "Empty", value: "empty" },
  { hint: "cloned into the sandbox", label: "Repository", value: "repo" },
  {
    hint: "written in before the agent starts",
    label: "Files",
    value: "files",
  },
] as const;

type SourceKind = (typeof SOURCE_KINDS)[number]["value"];

const emptyOf = (kind: SourceKind): EvalSource => {
  if (kind === "repo") {
    return { kind: "repo", ref: null, url: "" };
  }

  if (kind === "files") {
    return { files: {}, kind: "files" };
  }

  return { kind: "empty" };
};

/** A line that names the file the following lines belong to. */
const FILE_HEADER = /^---\s+(.+)$/;

const filesToText = (files: Readonly<Record<string, string>>) =>
  Object.entries(files)
    .map(([path, content]) => `--- ${path}\n${content}`)
    .join("\n");

/** Files are written as one block with `--- path` separators rather than as a
 * pane per file, because a case with four files should not be four editors,
 * and this is the shape a person can paste into. */
const textToFiles = (text: string): Record<string, string> => {
  const files: Record<string, string> = {};
  let path: string | null = null;
  let body: string[] = [];

  const flush = () => {
    if (path !== null) {
      files[path] = `${body.join("\n")}\n`;
    }
  };

  for (const line of text.split("\n")) {
    const header = line.match(FILE_HEADER);

    if (header?.[1] === undefined) {
      body.push(line);
      continue;
    }

    flush();
    path = header[1].trim();
    body = [];
  }

  flush();

  return files;
};

const SourceFields = ({
  onChange,
  source,
}: {
  readonly onChange: (source: EvalSource) => void;
  readonly source: EvalSource;
}) => {
  if (source.kind === "repo") {
    return (
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div className="grid gap-2">
          <Label htmlFor="repo-url">Repository</Label>
          <Input
            id="repo-url"
            onChange={(event) =>
              onChange({ ...source, url: event.target.value })
            }
            placeholder="https://github.com/acme/api"
            value={source.url}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="repo-ref">Ref</Label>
          <Input
            id="repo-ref"
            onChange={(event) =>
              onChange({
                ...source,
                ref: event.target.value === "" ? null : event.target.value,
              })
            }
            placeholder="main"
            value={source.ref ?? ""}
          />
        </div>
      </div>
    );
  }

  if (source.kind === "files") {
    return (
      <div className="grid gap-2">
        <Label htmlFor="files">Files</Label>
        <Textarea
          className="resize-y font-mono text-xs leading-relaxed"
          id="files"
          onChange={(event) =>
            onChange({ files: textToFiles(event.target.value), kind: "files" })
          }
          rows={8}
          spellCheck={false}
          value={filesToText(source.files)}
        />
        <p className="text-muted-foreground text-xs">
          Separate files with a line reading <code>--- path/to/file</code>.
        </p>
      </div>
    );
  }

  return (
    <p className="text-muted-foreground text-sm">
      The sandbox starts empty. The agent builds whatever the goal asks for, and
      the verifier decides whether it worked.
    </p>
  );
};

export function CaseEditor({
  index,
  onChange,
  onRemove,
  removable,
  subject,
}: {
  readonly index: number;
  readonly onChange: (subject: EvalCase) => void;
  readonly onRemove: () => void;
  readonly removable: boolean;
  readonly subject: EvalCase;
}) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="grid flex-1 gap-2">
          <Label htmlFor={`case-goal-${index}`}>Goal</Label>
          <Input
            id={`case-goal-${index}`}
            onChange={(event) =>
              onChange({ ...subject, goal: event.target.value })
            }
            placeholder="the parser rejects valid input, fix it"
            value={subject.goal}
          />
        </div>

        {removable ? (
          <Button
            aria-label={`Remove case ${index + 1}`}
            className="mt-7"
            onClick={onRemove}
            size="icon"
            type="button"
            variant="ghost"
          >
            <TrashIcon />
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`case-name-${index}`}>Name</Label>
          <Input
            id={`case-name-${index}`}
            onChange={(event) =>
              onChange({ ...subject, name: event.target.value })
            }
            value={subject.name}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`case-source-${index}`}>Starts from</Label>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            id={`case-source-${index}`}
            onChange={(event) =>
              onChange({
                ...subject,
                source: emptyOf(event.target.value as SourceKind),
              })
            }
            value={subject.source.kind}
          >
            {SOURCE_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SourceFields
        onChange={(source) => onChange({ ...subject, source })}
        source={subject.source}
      />

      <div className="grid gap-2">
        <Label htmlFor={`case-verify-${index}`}>Verifier</Label>
        <Input
          className="font-mono text-xs"
          id={`case-verify-${index}`}
          onChange={(event) =>
            onChange({ ...subject, verify: event.target.value })
          }
          placeholder="npm test"
          value={subject.verify}
        />
        <p className="text-muted-foreground text-xs">
          Its exit code is the verdict, so a pipeline that swallows one is
          refused rather than trusted.
        </p>
      </div>
    </div>
  );
}
