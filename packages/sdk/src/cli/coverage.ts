import { PublicApi } from "@anpord/schema/public/api";
import { Command } from "@effect/cli";
import { HttpApi } from "@effect/platform";
import { HashSet } from "effect";
import { commands } from "./commands";

export const apiOperations = () => {
  const names: string[] = [];
  HttpApi.reflect(PublicApi as never, {
    onEndpoint: ({ endpoint, group }) => {
      names.push(
        `${(group as { readonly identifier: string }).identifier}.${(endpoint as { readonly name: string }).name}`
      );
    },
    onGroup: () => undefined,
  });
  return names.toSorted();
};

export const commandNames = () =>
  commands
    .flatMap((command) => HashSet.toValues(Command.getNames(command as never)))
    .toSorted();
