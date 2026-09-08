import { CopyButton } from "@anpord/ui/components/copy-button";
import { CodeContent } from "@anpord/ui/components/ui/code-card";
import type { CodeLanguage } from "@anpord/ui/lib/highlight";
import { CaretRightIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { EvidenceLabel } from "./evidence-label";
import { MarkdownProse } from "./markdown-prose";

const readableText = (parsed: unknown): string | null => {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  const structured = record.structured_content ?? record.structuredContent;
  if (structured && typeof structured === "object") {
    const content = (structured as Record<string, unknown>).content;
    if (typeof content === "string") {
      return content;
    }
  }
  if (Array.isArray(record.content)) {
    const text = record.content
      .filter(
        (item): item is { text: string } =>
          !!item &&
          typeof item === "object" &&
          item.type === "text" &&
          typeof item.text === "string"
      )
      .map((item) => item.text)
      .join("\n\n");
    if (text) {
      return text;
    }
  }
  return null;
};

/* `prose` renders as Markdown; `preformatted` keeps its own line breaks, which
   Markdown would fold away; the rest are highlighted as code. */
type ValueShape = "json" | "preformatted" | "prose";

interface FormattedValue {
  code: string;
  lang: CodeLanguage;
  raw?: string;
  shape: ValueShape;
}

/* Log and file output arrives one record per line -- numbered gutters, stack
   frames, key/value pairs. Markdown joins those lines into one paragraph, so
   the shape has to be read before a renderer is chosen. */
const NUMBERED_LINE = /^\s*\d+[:\t|]/;

const preformatted = (text: string): boolean => {
  const lines = text.split("\n");
  if (lines.length < 2) {
    return false;
  }
  const numbered = lines.filter((line) => NUMBERED_LINE.test(line)).length;
  return numbered >= Math.max(2, Math.ceil(lines.length / 2));
};

const asText = (text: string): FormattedValue =>
  preformatted(text)
    ? { code: text, lang: "text", shape: "preformatted" }
    : { code: text, lang: "text", shape: "prose" };

/* Tool responses often nest JSON inside the text block of an envelope, which
   arrives double-escaped. Reading the payload out beats showing \" to a human. */
const unwrap = (text: string): FormattedValue => {
  try {
    const inner: unknown = JSON.parse(text);
    if (inner && typeof inner === "object") {
      return {
        code: JSON.stringify(inner, null, 2),
        lang: "json",
        shape: "json",
      };
    }
  } catch {
    /* Not JSON, so the text is already the readable form. */
  }
  return asText(text);
};

const formatValue = (value: string): FormattedValue => {
  try {
    const parsed: unknown = JSON.parse(value);
    const readable = readableText(parsed);
    if (readable !== null) {
      return { ...unwrap(readable), raw: JSON.stringify(parsed, null, 2) };
    }
    return typeof parsed === "string"
      ? asText(parsed)
      : {
          code: JSON.stringify(parsed, null, 2),
          lang: "json",
          shape: "json",
        };
  } catch {
    return asText(value);
  }
};

export function EvidenceValue({
  label,
  value,
  truncated,
  disclosure,
  open,
  children,
  unavailable = "Not recorded",
}: {
  readonly label: string;
  readonly value: string | undefined;
  readonly truncated?: boolean;
  readonly disclosure?: boolean;
  readonly open?: boolean;
  readonly children?: ReactNode;
  readonly unavailable?: string;
}) {
  const formatted = value === undefined ? null : formatValue(value);
  const header = (
    <>
      <EvidenceLabel label={label} />
      {value === undefined ? null : (
        <CopyButton
          className="size-6 shrink-0 opacity-0 transition-opacity duration-150 ease-out focus-visible:opacity-100 group-hover/evidence:opacity-100"
          label={`Copy ${label}`}
          value={value}
        />
      )}
    </>
  );
  const content = (
    <>
      {formatted === null ? (
        <p className="py-2 text-muted-foreground text-xs">{unavailable}</p>
      ) : null}
      {formatted?.shape === "prose" ? (
        <div className="max-h-80 overflow-auto py-2 text-foreground/90">
          <MarkdownProse text={formatted.code || "(empty)"} />
        </div>
      ) : null}
      {formatted?.shape === "preformatted" ? (
        <div className="my-2 overflow-hidden rounded-lg border border-border-faint bg-muted/30">
          <CodeContent code={formatted.code} lang="text" maxHeight="max-h-80" />
        </div>
      ) : null}
      {formatted?.shape === "json" ? (
        <div className="my-2 overflow-hidden rounded-lg border border-border-faint bg-muted/30">
          <CodeContent code={formatted.code} lang="json" maxHeight="max-h-80" />
        </div>
      ) : null}
      {formatted?.raw ? (
        <details className="group/raw ml-3 border-border-faint border-l pl-3 [&[open]>summary>svg]:rotate-90">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 py-2 text-[0.6875rem] text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <CaretRightIcon
              aria-hidden="true"
              className="size-2.5 shrink-0 transition-transform"
            />
            Raw value
          </summary>
          <div className="mb-2 overflow-hidden rounded-lg border border-border-faint bg-muted/30">
            <CodeContent
              code={formatted.raw}
              lang="json"
              maxHeight="max-h-64"
            />
          </div>
        </details>
      ) : null}
      {truncated ? (
        <p className="pb-2 text-warning text-xs">Truncated</p>
      ) : null}
    </>
  );
  return disclosure ? (
    <details
      className="group/evidence min-w-0 [&[open]>summary>svg]:rotate-90"
      open={open}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 py-2 text-xs focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <CaretRightIcon
          aria-hidden="true"
          className="size-3 shrink-0 text-muted-foreground transition-transform"
        />
        {header}
      </summary>
      {content}
      {children}
    </details>
  ) : (
    <div className="group/evidence min-w-0">
      <dt className="flex items-center gap-2 pt-2 text-xs">{header}</dt>
      <dd>{content}</dd>
    </div>
  );
}
