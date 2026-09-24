export const isUnguardedPipeline = (command: string) => {
  let quote: string | null = null;

  for (let index = 0; index < command.length; index++) {
    const character = command[index];

    if (quote !== null) {
      if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (character !== "|") {
      continue;
    }

    if (command[index + 1] === "|") {
      index++;
      continue;
    }

    if (command[index - 1] === "|") {
      continue;
    }

    return !(command.includes("PIPESTATUS") || command.includes("pipefail"));
  }

  return false;
};
