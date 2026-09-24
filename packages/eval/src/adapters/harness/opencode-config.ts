import { Option, Schema } from "effect";

const CONFIG_VARIABLE = "OPENCODE_CONFIG_CONTENT";

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const decodeJson = Schema.decodeUnknownOption(Schema.parseJson());

const parsed = (value: string | undefined): Json =>
  decodeJson(value).pipe(
    Option.filter(isObject),
    Option.getOrElse((): Json => ({}))
  );

const stringsOf = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

const merged = (base: Json, extra: Json): Json =>
  Object.fromEntries([
    ...Object.entries(base),
    ...Object.entries(extra).map(([key, value]) => {
      const current = base[key];
      return [
        key,
        isObject(current) && isObject(value) ? merged(current, value) : value,
      ];
    }),
  ]);

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
