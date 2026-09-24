import { HttpClientRequest } from "@effect/platform";
import type { Redacted } from "effect";

export const githubRequest = (
  method: "GET" | "POST",
  path: string,
  token: Redacted.Redacted<string>
) =>
  HttpClientRequest.make(method)(`https://api.github.com${path}`).pipe(
    HttpClientRequest.bearerToken(token),
    HttpClientRequest.setHeaders({
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    })
  );
