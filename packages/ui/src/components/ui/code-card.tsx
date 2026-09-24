import type { ReactNode } from "react";
import { CopyButton } from "@anpord/ui/components/copy-button";
import { CodeContent } from "@anpord/ui/components/ui/code-content";
import {
  CODE_FRAME_ACTION,
  CodeFrame,
} from "@anpord/ui/components/ui/code-frame";
import type { CodeLanguage } from "@anpord/ui/lib/highlight";

export function CodeCard({
  className,
  code,
  icon,
  label,
  lang,
  maxHeight = "max-h-[28rem]",
}: {
  readonly className?: string;
  readonly code: string;
  readonly icon?: ReactNode;
  readonly label: string;
  readonly lang: CodeLanguage;
  readonly maxHeight?: string;
}) {
  return (
    <CodeFrame
      actions={
        <CopyButton
          className={CODE_FRAME_ACTION}
          label={`Copy ${label}`}
          size="inline"
          value={code}
        />
      }
      className={className}
      icon={icon}
      label={label}
    >
      <CodeContent code={code} lang={lang} maxHeight={maxHeight} />
    </CodeFrame>
  );
}
