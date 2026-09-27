export const arg = (flag: string) => {
  const at = process.argv.indexOf(`--${flag}`);

  return at === -1 ? undefined : process.argv[at + 1];
};

export const required = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
};
