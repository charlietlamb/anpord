/* An alias like `opus` is one segment of the id the harness resolves it to. */
export const reportsModel = (requested: string, reported: string) =>
  reported === requested || reported.split("-").includes(requested);
