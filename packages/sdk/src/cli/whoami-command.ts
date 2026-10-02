import { Command, Options } from "@effect/cli";
import type { Whoami } from "@sphynx/schema/public/auth-api";
import { SphynxApi } from "@sphynx/schema/public/client";
import { Effect } from "effect";
import { labelled } from "./labelled-row";
import { paletteFor } from "./paint";
import { json, note, row } from "./render";
import { stderrStyle } from "./transcript-writer";

const asJson = Options.boolean("json").pipe(
  Options.withDescription("Print the result as JSON")
);

const credentialFacts = (
  credential: Whoami["credential"]
): readonly (readonly [string, string])[] => {
  if (credential.kind === "oauth") {
    return [["credential", "OAuth token"]];
  }

  return [
    ["key", credential.name ?? "Unnamed key"],
    ...(credential.start === null
      ? []
      : [["key starts with", credential.start] as const]),
  ];
};

export const whoamiLines = (whoami: Whoami): readonly string[] => {
  const facts = [
    ["organization", whoami.organization.name],
    ["organization slug", whoami.organization.slug],
    ["organization id", whoami.organization.id],
    ...credentialFacts(whoami.credential),
    [
      "permissions",
      whoami.permissions.length === 0 ? "none" : whoami.permissions.join(", "),
    ],
  ] as const;
  const width = Math.max(...facts.map(([label]) => label.length)) + 2;

  return facts.map(([label, value]) => `${label.padEnd(width)}${value}`);
};

export const whoami = Command.make(
  "whoami",
  { asJson },
  ({ asJson: wantsJson }) =>
    Effect.gen(function* () {
      const api = yield* SphynxApi;
      const found = yield* api.auth.whoami({ payload: {} });

      if (wantsJson) {
        return yield* json(found);
      }

      return yield* Effect.forEach(whoamiLines(found), row);
    })
).pipe(
  Command.withDescription(
    "Show the organization and key SPHYNX_API_KEY acts for"
  )
);

export const announceOrganization = SphynxApi.pipe(
  Effect.flatMap((api) => api.auth.whoami({ payload: {} })),
  Effect.flatMap(({ organization }) =>
    note(
      labelled(
        "Org",
        `${organization.name} (${organization.slug})`,
        paletteFor(stderrStyle().colour)
      )
    )
  ),
  Effect.ignore
);
