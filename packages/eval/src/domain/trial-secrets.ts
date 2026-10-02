import type {
  CredentialValues,
  ResolvedCredential,
} from "@sphynx/schema/domain/credentials";
import { Option, Redacted, Schema } from "effect";

const SECRET_WORDS = new Set([
  "apikey",
  "auth",
  "cookie",
  "credential",
  "credentials",
  "dsn",
  "key",
  "passphrase",
  "passwd",
  "password",
  "pat",
  "private",
  "pwd",
  "secret",
  "session",
  "token",
]);

const TOKEN = /^(?=[^/.~])(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9_\-+/=.~]{16,}$/;
const ADDRESS = /^[a-z][a-z0-9+.-]*:\/\//i;
const LETTERS_ONLY = /^[A-Za-z]*$/;
const NAME_BREAK = /[^a-z0-9]+/;

const tokenShaped = (value: string) => TOKEN.test(value);
const unescaped = Option.liftThrowable(decodeURIComponent);
const jsonOf = Schema.decodeUnknownOption(Schema.parseJson());

const secretNamed = (name: string) =>
  name
    .toLowerCase()
    .split(NAME_BREAK)
    .some((word) => SECRET_WORDS.has(word));

const addressOf = (value: string) =>
  ADDRESS.test(value) ? Option.fromNullable(URL.parse(value)) : Option.none();

const inAddress = ({ password, searchParams, username }: URL) => [
  ...(LETTERS_ONLY.test(password)
    ? []
    : [password, ...Option.toArray(unescaped(password))]),
  ...[
    Option.getOrElse(unescaped(username), () => username),
    ...searchParams.values(),
  ].filter(tokenShaped),
];

const stringsIn = (value: unknown): readonly string[] => {
  if (typeof value === "string") {
    return [value];
  }
  return typeof value === "object" && value !== null
    ? Object.values(value).flatMap(stringsIn)
    : [];
};

const valueSecrets = (values: CredentialValues) =>
  Object.values(values)
    .flatMap((value) => [
      value,
      ...Option.match(jsonOf(value), { onNone: () => [], onSome: stringsIn }),
    ])
    .flatMap((value) =>
      Option.match(addressOf(value), {
        onNone: () => [value],
        onSome: inAddress,
      })
    );

const forwardedSecrets = ([name, value]: readonly [string, string]) =>
  Option.match(addressOf(value), {
    onNone: () => (secretNamed(name) || tokenShaped(value) ? [value] : []),
    onSome: inAddress,
  });

export const trialSecrets = (request: {
  readonly forwarded?: Readonly<Record<string, string>>;
  readonly harnessCredential: Redacted.Redacted<ResolvedCredential>;
  readonly sandboxCredentials?: Redacted.Redacted<CredentialValues>;
}): readonly string[] => [
  ...valueSecrets(Redacted.value(request.harnessCredential).values),
  ...(request.sandboxCredentials === undefined
    ? []
    : valueSecrets(Redacted.value(request.sandboxCredentials))),
  ...Object.entries(request.forwarded ?? {}).flatMap(forwardedSecrets),
];
