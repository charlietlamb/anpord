import { type ComponentType, createElement, lazy } from "react";

export const preloadable = <Props extends object>(
  load: () => Promise<ComponentType<Props>>
) => {
  let pending: Promise<ComponentType<Props>> | undefined;
  const preload = () => {
    pending ??= load().catch((error: unknown) => {
      pending = undefined;
      Loaded = lazyLoaded();
      throw error;
    });
    return pending;
  };
  const lazyLoaded = () => lazy(async () => ({ default: await preload() }));
  let Loaded = lazyLoaded();
  return {
    Component: (props: Props) => createElement(Loaded, props),
    preload: () => {
      preload().catch(() => undefined);
    },
  };
};
