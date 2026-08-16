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

export const CHANNEL_TONES: Record<ChannelColor, string> = {
  amber:
    "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  blue: "border-blue-500/25 bg-blue-500/12 text-blue-700 dark:text-blue-300",
  green:
    "border-green-500/25 bg-green-500/12 text-green-700 dark:text-green-300",
  pink: "border-pink-500/25 bg-pink-500/12 text-pink-700 dark:text-pink-300",
  purple:
    "border-purple-500/25 bg-purple-500/12 text-purple-700 dark:text-purple-300",
  red: "border-red-500/25 bg-red-500/12 text-red-700 dark:text-red-300",
  slate:
    "border-slate-500/25 bg-slate-500/12 text-slate-700 dark:text-slate-300",
  teal: "border-teal-500/25 bg-teal-500/12 text-teal-700 dark:text-teal-300",
};
