import { equals } from "./expect";

/* The API, SDK and CLI are transports over the same operations, so a shared behaviour is written once and run against each. */
export interface PromptSurface {
  readonly get: (
    id: string,
    selector?: { readonly channel?: string; readonly version?: number }
  ) => Promise<{ readonly content: string; readonly version: number }>;
  readonly promote: (
    id: string,
    channel: string,
    version: number
  ) => Promise<void>;
  readonly update: (id: string, content: string) => Promise<number>;
}

/* Updating writes a version, promoting ships it: reversing them would put an edit into production the moment it was saved. */
export const drafting = async (
  surface: PromptSurface,
  id: string,
  live: number
) => {
  const drafted = await surface.update(id, "a drafted body");
  equals("the write reports the new version", drafted, live + 1);

  const served = await surface.get(id);
  equals("the live version has not moved", served.version, live);

  await surface.promote(id, "production", drafted);

  const promoted = await surface.get(id);
  equals("promoting moves it", promoted.version, drafted);
  return drafted;
};

/* Rolling back is the reason the channel indirection exists. */
export const rollback = async (
  surface: PromptSurface,
  id: string,
  from: number,
  to: number
) => {
  await surface.promote(id, "production", from);
  equals(
    "production serves the newer version",
    (await surface.get(id)).version,
    from
  );

  await surface.promote(id, "production", to);
  equals("production rolls back", (await surface.get(id)).version, to);
};
