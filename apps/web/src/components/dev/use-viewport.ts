import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};

const snapshot = () => `${window.innerWidth}x${window.innerHeight}`;

export function useViewport() {
  const [width, height] = useSyncExternalStore(
    subscribe,
    snapshot,
    () => "1440x900"
  )
    .split("x")
    .map(Number);

  return { height: height ?? 900, width: width ?? 1440 };
}
