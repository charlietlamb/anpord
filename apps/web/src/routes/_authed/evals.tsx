import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/evals")({
  component: EvalsLayout,
  staticData: { title: "Evals" },
});

/** Each route owns its own scrolling, so a run that grows a long journal
 * scrolls without the page header leaving with it. */
function EvalsLayout() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Outlet />
    </div>
  );
}
