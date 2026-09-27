import type { ReactNode } from "react";

export interface Preset {
  readonly id: string;
  readonly name: string;
}

export interface PresetKind<P extends Preset> {
  readonly caption?: (preset: P) => ReactNode;
  readonly description: string;
  readonly families: readonly {
    readonly description: string;
    readonly name: string;
    readonly presets: readonly P[];
  }[];
  readonly heightRatio: number;
  readonly landing: (preset: P) => ReactNode;
  readonly navLayer: "z-10" | "z-50";
  readonly presets: readonly P[];
  readonly sectionGap: "gap-8" | "gap-12";
  readonly title: string;
  readonly to: "/dev/dithers" | "/dev/headers";
}
