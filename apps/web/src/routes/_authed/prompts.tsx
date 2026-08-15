import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/prompts")({
  component: PromptsLayout,
  staticData: { title: "Prompts" },
});

/** Fills the inset so child routes can centre themselves vertically. */
function PromptsLayout() {
  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Outlet />
    </div>
  );
}
