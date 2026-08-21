/** Colours are stored as token names rather than hex, so a channel keeps its
 * meaning when the theme changes and every swatch is guaranteed to stay legible
 * against both grounds. Full class strings, never interpolated, so Tailwind can
 * see them. */
export const CHANNEL_COLORS = [
  "slate",
  "blue",
  "teal",
  "green",
  "amber",
  "red",
  "purple",
  "pink",
] as const;

export type ChannelColor = (typeof CHANNEL_COLORS)[number];

export const CHANNEL_DEFAULT_COLOR: ChannelColor = "slate";

export const CHANNEL_SWATCHES: Record<ChannelColor, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  pink: "bg-pink-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
  slate: "bg-slate-400",
  teal: "bg-teal-500",
};
