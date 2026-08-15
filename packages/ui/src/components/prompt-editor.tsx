import { useId } from "react";
import { cn } from "../lib/utils";

const VARIABLE_SPLIT = /(\{\{\s*[\w.-]+\s*\}\})/g;
/** Separate non-global copy: `test` on a global regex advances lastIndex. */
const IS_VARIABLE = /^\{\{\s*[\w.-]+\s*\}\}$/;

/** Trailing newline keeps the mirrored block's height in step with the textarea. */
function segments(value: string) {
  return `${value}\n`.split(VARIABLE_SPLIT);
}

const SHARED_TEXT =
  "whitespace-pre-wrap break-words text-[0.9375rem] leading-7";

interface PromptEditorProps {
  readonly className?: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly value: string;
}

/**
 * A textarea cannot render markup, so highlighting is a mirrored block behind a
 * transparent input. Both share the same text metrics and padding, which is
 * what keeps the highlights aligned with the caret.
 */
export function PromptEditor({
  className,
  onChange,
  placeholder,
  value,
}: PromptEditorProps) {
  const id = useId();

  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden="true"
        className={cn(
          SHARED_TEXT,
          "pointer-events-none min-h-36 px-4 pt-4 pb-2 text-transparent"
        )}
      >
        {segments(value).map((segment, index) =>
          IS_VARIABLE.test(segment) ? (
            <mark
              className="rounded-[3px] bg-primary/15 text-transparent"
              key={`${id}-${index}`}
            >
              {segment}
            </mark>
          ) : (
            segment
          )
        )}
      </div>

      <textarea
        className={cn(
          SHARED_TEXT,
          "absolute inset-0 size-full resize-none bg-transparent px-4 pt-4 pb-2 text-foreground caret-foreground outline-none",
          "placeholder:text-muted-foreground/70"
        )}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        value={value}
      />
    </div>
  );
}
