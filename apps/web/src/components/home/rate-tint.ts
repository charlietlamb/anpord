const BANDS = [
  { from: 95, tint: "bg-success/15 ring-success/30" },
  { from: 85, tint: "bg-success/8 ring-success/20" },
  { from: 75, tint: "bg-warning/12 ring-warning/30" },
  { from: 0, tint: "bg-destructive/12 ring-destructive/30" },
];

export const rateTint = (rate: number) =>
  BANDS.find((band) => rate >= band.from)?.tint ?? "";
