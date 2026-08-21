/** Unknown placeholders are left alone rather than blanked: a prompt naming
 * something nothing supplies is a mistake worth seeing in the output. */
const PLACEHOLDER = /\{\{\s*([a-zA-Z][\w.]*)\s*\}\}/g;

export const renderPrompt = (
  template: string,
  values: Readonly<Record<string, string>>
) =>
  template.replaceAll(PLACEHOLDER, (whole, name: string) =>
    Object.hasOwn(values, name) ? (values[name] ?? whole) : whole
  );
