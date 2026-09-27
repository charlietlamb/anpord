import { CURRENT_HEADER } from "@anpord/ui/lib/current-header";
import type { HeaderPreset } from "@anpord/ui/lib/header-presets";
import { PresetHeader } from "@/components/layout/preset-header";

export function SiteHeader({ preset }: { readonly preset?: HeaderPreset }) {
  return <PresetHeader preset={preset ?? CURRENT_HEADER} />;
}
