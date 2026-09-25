import { useEffect, useState } from "react";

export function useWatchedBox<Element extends HTMLElement>() {
  const [element, setElement] = useState<Element | null>(null);
  const [box, setBox] = useState({ visible: false, width: 0 });

  useEffect(() => {
    if (element === null) {
      return;
    }

    const visibility = new IntersectionObserver(
      ([entry]) =>
        setBox((current) => ({
          ...current,
          visible: entry?.isIntersecting ?? false,
        })),
      { rootMargin: "0px" }
    );
    const size = new ResizeObserver(([entry]) =>
      setBox((current) => ({
        ...current,
        width: entry?.contentRect.width ?? 0,
      }))
    );

    visibility.observe(element);
    size.observe(element);

    return () => {
      visibility.disconnect();
      size.disconnect();
    };
  }, [element]);

  return { ...box, ref: setElement };
}
