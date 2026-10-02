import { CURRENT_HEADER } from "@sphynx/ui/lib/current-header";
import type { HeaderPreset } from "@sphynx/ui/lib/header-presets";
import { PresetHeader } from "@/components/layout/preset-header";

export function SiteHeader({ preset }: { readonly preset?: HeaderPreset }) {
  return <PresetHeader preset={preset ?? CURRENT_HEADER} />;
}
