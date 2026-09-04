const CONFIG_VARIABLE = "OPENCODE_CONFIG_CONTENT";

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parsed = (value: string | undefined): Json => {
  if (value === undefined) {
    return {};
  }

  try {
    const decoded: unknown = JSON.parse(value);
    return isObject(decoded) ? decoded : {};
  } catch {
    return {};
  }
};

const stringsOf = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

const merged = (base: Json, extra: Json): Json => {
  const result: Json = { ...base };

  for (const [key, value] of Object.entries(extra)) {
    const current = result[key];
    result[key] =
      isObject(current) && isObject(value) ? merged(current, value) : value;
  }

  return result;
};

/**
 * The config content OpenCode reads, carrying the profile's system prompt.
 *
 * `instructions` is concatenated rather than merged, because OpenCode's own
 * merge replaces an array wholesale: writing the prompt path alone would drop
 * whatever instructions the profile declared for itself.
 */
export const opencodeConfigContent = (
  env: Readonly<Record<string, string>>,
  systemPromptPath: string
): string => {
  const own = parsed(env[CONFIG_VARIABLE]);

  return JSON.stringify(
    merged(own, {
      instructions: [...stringsOf(own.instructions), systemPromptPath],
    })
  );
};

export const opencodeConfigEnv = (
  env: Readonly<Record<string, string>>,
  systemPromptPath: string
): Readonly<Record<string, string>> => ({
  ...env,
  [CONFIG_VARIABLE]: opencodeConfigContent(env, systemPromptPath),
});
