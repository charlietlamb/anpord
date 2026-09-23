import type { ValidationValue } from "@anpord/schema/domain/eval-validations";

const object = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const judgeInput = (
  input: ValidationValue
): readonly { label: string; value: string }[] | null => {
  if (input.state !== "captured" || input.truncated) {
    return null;
  }
  try {
    const request = object(JSON.parse(input.text));
    if (!request) {
      return null;
    }
    const prompt = typeof request.prompt === "string" ? request.prompt : "";
    const marker = "\n\nEvidence:\n";
    const separator = prompt.lastIndexOf(marker);
    let raw = request.input;
    let instructions = request.instructions;
    if (separator >= 0) {
      raw = prompt.slice(separator + marker.length);
      instructions = prompt.slice(0, separator);
    }
    const evidence = typeof raw === "string" ? object(JSON.parse(raw)) : null;
    if (
      !evidence ||
      typeof evidence.output !== "string" ||
      typeof instructions !== "string"
    ) {
      return null;
    }
    return [
      { label: "Agent answer", value: evidence.output },
      { label: "Judge instructions", value: instructions },
      ...(typeof evidence.input === "string"
        ? [{ label: "Agent prompt", value: evidence.input }]
        : []),
      ...(typeof evidence.expected === "string"
        ? [{ label: "Expected", value: evidence.expected }]
        : []),
    ];
  } catch {
    return null;
  }
};
