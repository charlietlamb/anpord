const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
const DEVICE_URL = /https:\/\/\S+\/codex\/device/;
const DEVICE_CODE = /\b[A-Z0-9]{4}-[A-Z0-9]{5}\b/;

export interface DeviceChallenge {
  readonly code: string;
  readonly verificationUrl: string;
}

export const stripAnsi = (output: string) => output.replace(ANSI, "");

export const parseDeviceChallenge = (
  output: string
): DeviceChallenge | null => {
  const text = stripAnsi(output);
  const verificationUrl = text.match(DEVICE_URL)?.[0];
  const code = text.match(DEVICE_CODE)?.[0];
  return verificationUrl && code ? { code, verificationUrl } : null;
};
