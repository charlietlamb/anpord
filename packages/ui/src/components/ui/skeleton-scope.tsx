import type { ReactNode } from "react";

const SCOPE = [
  "contents pointer-events-none select-none **:text-clip!",
  "[&_:is(div,span,p,a,button,h1,h2,h3,h4,dt,dd,time,code,kbd,label,li):not(:has(*),:empty,[class*=skeleton-block],.skeleton-static,.skeleton-static_*)]:skeleton-text",
  "[&_:is(input:not([type=hidden],[aria-hidden=true]),textarea):not([class*=skeleton-block],.skeleton-static_*)]:skeleton-text",
  "[&_svg:not(.skeleton-static_svg)]:skeleton-paint [&_svg]:rounded-sm",
  "[&_[style*=background]:not(.skeleton-static_*)]:skeleton-paint",
].join(" ");

export function SkeletonScope({
  children,
  loading = true,
}: {
  readonly children: ReactNode;
  readonly loading?: boolean;
}) {
  if (!loading) {
    return children;
  }

  return (
    <div aria-busy="true" className={SCOPE} data-skeleton inert>
      {children}
    </div>
  );
}
