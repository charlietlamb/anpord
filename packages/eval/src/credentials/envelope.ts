const encoder = new TextEncoder();
const decoder = new TextDecoder();
const encode = (value: Uint8Array) => Buffer.from(value).toString("base64url");
const decode = (value: string) =>
  Uint8Array.from(Buffer.from(value, "base64url"));

export const deriveEnvelopeKey = async (secret: string) =>
  crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", encoder.encode(secret)),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );

export const openEnvelope = async (
  key: CryptoKey,
  sealed: string,
  context: string
) => {
  const [version, iv, encrypted] = sealed.split(".");
  if (version !== "v1" || !iv || !encrypted) {
    throw new Error("Invalid envelope");
  }
  const value = await crypto.subtle.decrypt(
    {
      additionalData: encoder.encode(context),
      iv: decode(iv),
      name: "AES-GCM",
    },
    key,
    decode(encrypted)
  );
  return decoder.decode(value);
};

export const sealEnvelope = async (
  key: CryptoKey,
  value: string,
  context: string
) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    {
      additionalData: encoder.encode(context),
      iv,
      name: "AES-GCM",
    },
    key,
    encoder.encode(value)
  );
  return ["v1", encode(iv), encode(new Uint8Array(encrypted))].join(".");
};
