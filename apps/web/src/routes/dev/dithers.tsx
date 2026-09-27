import {
  DITHER_FAMILIES,
  DITHER_PRESETS,
  type DitherPreset,
} from "@anpord/ui/lib/dither-presets";
import { createFileRoute } from "@tanstack/react-router";
import { PresetGallery } from "@/components/dev/preset-gallery";
import type { PresetKind } from "@/components/dev/preset-kind";
import { Landing } from "@/components/landing/landing";

export const Route = createFileRoute("/dev/dithers")({
  component: DithersPreview,
  validateSearch: (search): { id?: string } =>
    typeof search.id === "string" ? { id: search.id } : {},
  ssr: false,
});

const DITHERS: PresetKind<DitherPreset> = {
  description:
    "Each card is the landing page at your window size, scaled down. Open one for full size; arrow keys step through.",
  families: DITHER_FAMILIES,
  heightRatio: 1,
  landing: (preset) => <Landing dither={preset} />,
  navLayer: "z-10",
  presets: DITHER_PRESETS,
  sectionGap: "gap-12",
  title: "Dithers",
  to: "/dev/dithers",
};

function DithersPreview() {
  const { id } = Route.useSearch();
  return <PresetGallery id={id} kind={DITHERS} />;
}
