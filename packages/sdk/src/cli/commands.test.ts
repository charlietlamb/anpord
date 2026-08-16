import { describe, expect, test } from "bun:test";
import { apiOperations, commandNames } from "./coverage";

const OPERATION_COMMANDS: Record<string, readonly string[]> = {
  archive: [],
  create: [],
  get: ["get", "versions"],
  list: ["list"],
  promote: ["promote"],
  update: ["push"],
};

describe("coverage", () => {
  test("every operation the api exposes has a decision recorded here", () => {
    expect(Object.keys(OPERATION_COMMANDS).toSorted()).toEqual(apiOperations());
  });

  test("every command maps to an operation", () => {
    const mapped = Object.values(OPERATION_COMMANDS).flat().toSorted();
    expect(commandNames()).toEqual(mapped);
  });

  test("reading and publishing are reachable from the terminal", () => {
    for (const operation of ["get", "list", "update", "promote"]) {
      expect(OPERATION_COMMANDS[operation]).not.toBeEmpty();
    }
  });
});
