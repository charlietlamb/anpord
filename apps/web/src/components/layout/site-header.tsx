import {
  CURRENT_HEADER,
  type HeaderPreset,
} from "@anpord/ui/lib/header-presets";
import { PresetHeader } from "@/components/layout/preset-header";

export function SiteHeader({ preset }: { readonly preset?: HeaderPreset }) {
  return <PresetHeader preset={preset ?? CURRENT_HEADER} />;
}
