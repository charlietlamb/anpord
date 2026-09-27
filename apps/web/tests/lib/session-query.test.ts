import { expect, mock, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

const answers: boolean[] = [];
mock.module("../../src/lib/get-session", () => ({
  getSession: async () => ({ authenticated: answers.shift() ?? false }),
}));

const { sessionQuery } = await import("../../src/lib/session-query");

test("checks again right away after a signed out answer", async () => {
  answers.push(false, true);
  const queryClient = new QueryClient();

  expect(await queryClient.fetchQuery(sessionQuery)).toEqual({
    authenticated: false,
  });
  expect(await queryClient.fetchQuery(sessionQuery)).toEqual({
    authenticated: true,
  });
});

test("reuses a signed in answer within the minute", async () => {
  answers.push(true, false);
  const queryClient = new QueryClient();

  expect(await queryClient.fetchQuery(sessionQuery)).toEqual({
    authenticated: true,
  });
  expect(await queryClient.fetchQuery(sessionQuery)).toEqual({
    authenticated: true,
  });
  answers.length = 0;
});
