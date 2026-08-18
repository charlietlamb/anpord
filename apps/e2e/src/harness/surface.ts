import { equals } from "./expect";

/**
 * What every way into anpord can do, named once. The API, the SDK and the CLI
 * are different transports over the same operations, so a behaviour that must
 * hold everywhere is written once here and run against each of them.
 */
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

/**
 * Updating writes a version and promoting ships it. Getting these the wrong way
 * round would mean an edit reaching production the moment somebody saved it, so
 * every surface is held to it rather than one of them being trusted.
 */
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

/** A channel is a pointer, so pointing it backwards has to work as readily as
 * pointing it forwards. Rolling back is the reason the indirection exists. */
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
