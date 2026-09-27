import { type ComponentType, lazy } from "react";

export const preloadable = <Props extends object>(
  load: () => Promise<ComponentType<Props>>
) => {
  let pending: Promise<ComponentType<Props>> | undefined;
  const preload = () => {
    pending ??= load().catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
  return {
    Component: lazy(async () => ({ default: await preload() })),
    preload: () => {
      preload().catch(() => undefined);
    },
  };
};
