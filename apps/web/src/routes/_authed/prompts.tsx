import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/prompts")({
  component: PromptsLayout,
  staticData: { title: "Prompts" },
});

/** Each route owns its own scrolling, so the editor can hold a fixed header
 * above two panes that scroll independently. */
function PromptsLayout() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Outlet />
    </div>
  );
}
