import {
  unavailableValue,
  validationCapture,
} from "@anpord/schema/domain/eval-validations";

const SECRET_KEYS = [
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "api-key",
  "x-api-key",
  "token",
  "password",
  "secret",
];

export const apiCapture = (keys: readonly string[] = []) => {
  const sensitive = new Set(
    [...SECRET_KEYS, ...keys].map((key) => key.toLowerCase())
  );
  const capture = validationCapture();
  return (value: unknown) => {
    try {
      const text = JSON.stringify(value, (key, current: unknown) =>
        sensitive.has(key.toLowerCase()) ? "[redacted]" : current
      );
      return capture(text === undefined ? null : JSON.parse(text));
    } catch {
      return unavailableValue;
    }
  };
};
