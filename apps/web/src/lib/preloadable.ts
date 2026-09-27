import { type ComponentType, createElement, lazy } from "react";

export const preloadable = <Props extends object>(
  load: () => Promise<ComponentType<Props>>
) => {
  let loaded: ComponentType<Props> | undefined;
  let pending: Promise<ComponentType<Props>> | undefined;
  const preload = () => {
    pending ??= load().then(
      (component) => {
        loaded = component;
        return component;
      },
      (error: unknown) => {
        pending = undefined;
        Loaded = lazyLoaded();
        throw error;
      }
    );
    return pending;
  };
  const lazyLoaded = () => lazy(async () => ({ default: await preload() }));
  let Loaded = lazyLoaded();
  return {
    Component: (props: Props) => createElement(loaded ?? Loaded, props),
    preload: () =>
      preload().then(
        () => undefined,
        () => undefined
      ),
  };
};
