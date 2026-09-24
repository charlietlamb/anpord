import { Kbd } from "@anpord/ui/components/ui/kbd";
import { useMetaKeyLabel } from "@anpord/ui/hooks/use-meta-key-label";

const SHORTCUT_GLYPHS: Record<string, string> = {
  enter: "↵",
  backspace: "⌫",
  escape: "Esc",
};

export function ShortcutKeys({
  meta = false,
  shortcut,
}: {
  readonly meta?: boolean;
  readonly shortcut: string;
}) {
  const metaKeyLabel = useMetaKeyLabel();

  return (
    <span className="flex items-center gap-0.5 pointer-coarse:hidden">
      {meta ? <Kbd>{metaKeyLabel}</Kbd> : null}
      <Kbd>{SHORTCUT_GLYPHS[shortcut] ?? shortcut.toUpperCase()}</Kbd>
    </span>
  );
}
