import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@anpord/ui/components/ui/breadcrumb";
import { Link } from "@tanstack/react-router";
import { useBreadcrumbs } from "@/lib/use-breadcrumbs";

export function DashboardBreadcrumbs() {
  const crumbs = useBreadcrumbs();
  const last = crumbs.length - 1;

  return (
    <Breadcrumb>
      <BreadcrumbList className="gap-1 text-sm sm:gap-1">
        {crumbs.flatMap((crumb, index) => [
          ...(index > 0
            ? [<BreadcrumbSeparator key={`${crumb.href}-separator`} />]
            : []),
          <BreadcrumbItem key={crumb.href}>
            {index === last ? (
              <BreadcrumbPage className="font-heading tracking-[-0.02em]">
                {crumb.label}
              </BreadcrumbPage>
            ) : (
              <BreadcrumbLink render={<Link to={crumb.href} />}>
                {crumb.label}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>,
        ])}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
