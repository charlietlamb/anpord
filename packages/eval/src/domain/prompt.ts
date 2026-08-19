/**
 * A prompt is a template over a case, so one prompt applies to every row of a
 * dataset instead of being retyped for each. The vocabulary matches what a
 * user already expects from an eval tool: `{{goal}}` is the case's own goal.
 *
 * Unknown placeholders are left alone rather than blanked. A prompt that says
 * `{{context}}` when nothing supplies one is a mistake worth seeing in the
 * output, not a silent empty string that changes what the agent was asked.
 */
const PLACEHOLDER = /\{\{\s*([a-zA-Z][\w.]*)\s*\}\}/g;

export const renderPrompt = (
  template: string,
  values: Readonly<Record<string, string>>
) =>
  template.replaceAll(PLACEHOLDER, (whole, name: string) =>
    Object.hasOwn(values, name) ? (values[name] ?? whole) : whole
  );
