export interface Command {
  readonly kind: "command";
  readonly run: string;
}

export const command = (run: string): Command => {
  if (run.trim() === "") {
    throw new TypeError(
      'command() needs a shell command, such as command("bun test").'
    );
  }

  return { kind: "command", run };
};

export const isCommand = (value: unknown): value is Command =>
  typeof value === "object" &&
  value !== null &&
  (value as { readonly kind?: unknown }).kind === "command";
