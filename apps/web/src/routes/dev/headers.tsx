import {
  HEADER_FAMILIES,
  HEADER_PRESETS,
  type HeaderPreset,
} from "@anpord/ui/lib/header-presets";
import { createFileRoute } from "@tanstack/react-router";
import { PresetGallery } from "@/components/dev/preset-gallery";
import type { PresetKind } from "@/components/dev/preset-kind";
import { Landing } from "@/components/landing/landing";

export const Route = createFileRoute("/dev/headers")({
  component: HeadersPreview,
  validateSearch: (search): { id?: string } =>
    typeof search.id === "string" ? { id: search.id } : {},
  ssr: false,
});

const HEADERS: PresetKind<HeaderPreset> = {
  caption: (preset) => (
    <span className="truncate text-muted-foreground text-xs">
      {preset.source}
    </span>
  ),
  description:
    "Each card is the landing page at your window size, cropped to the top. Open one for full size; arrow keys step through.",
  families: HEADER_FAMILIES,
  heightRatio: 0.55,
  landing: (preset) => <Landing header={preset} />,
  navLayer: "z-50",
  presets: HEADER_PRESETS,
  sectionGap: "gap-8",
  title: "Headers",
  to: "/dev/headers",
};

function HeadersPreview() {
  const { id } = Route.useSearch();
  return <PresetGallery id={id} kind={HEADERS} />;
}
